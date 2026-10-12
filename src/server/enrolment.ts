import "server-only";
import type { CreatedVia } from "@prisma/client";
import { db } from "./db";
import { audit } from "./audit";
import { sendMail } from "./mail";
import { credit } from "./wallet";
import { hashPassword } from "./auth";
import { checkCompany } from "./companies-house";

const YEAR_MS = 365 * 24 * 3600 * 1000;

function contractHtml(productName: string, memberName: string) {
  return `
    <h2>Membership Agreement — ${productName}</h2>
    <p><em>PLACEHOLDER CONTRACT TEXT — final legal wording to be supplied by the client's legal advisor before go-live.</em></p>
    <p>This agreement is entered into between the Membership Body ("the Organisation") and <strong>${memberName}</strong> ("the Member").</p>
    <p>1. The Member is granted the benefits of the ${productName} tier as published at the date of signature.</p>
    <p>2. Fees are payable in advance by card or, where offered, by Direct Debit instalments.</p>
    <p>3. Membership activates only once this agreement is signed and the first payment or Direct Debit mandate is confirmed.</p>
    <p>4. The Organisation processes personal data in accordance with UK GDPR and the Data Protection Act 2018.</p>
    <p>5. Either party may terminate in accordance with the published terms; statutory rights are unaffected.</p>`;
}

/**
 * Start of the state machine: creates (or reuses) the user, creates the
 * membership in DRAFT, generates the tier contract, and advances to
 * AWAITING_SIGNATURE. Online self-service and Sales manual enrolment both
 * enter HERE — same contract, same gates, no side doors.
 */
export async function startEnrolment(opts: {
  email: string; name: string; company?: string; password?: string;
  productCode: string; via: CreatedVia; salesRepId?: string; summitCategoryId?: string;
  orgName?: string; orgNumber?: string; orgDocs?: string[];
}) {
  const product = await db.product.findUniqueOrThrow({ where: { code: opts.productCode } });
  if (product.billing === "ONE_TIME" && opts.summitCategoryId) {
    // Validate the chosen category belongs to an OPEN summit before we sell the slot.
    const cat = await db.summitCategory.findUnique({
      where: { id: opts.summitCategoryId }, include: { summit: true },
    });
    if (!cat || cat.summit.status !== "OPEN") throw new Error("That Summit category is not open for applications.");
  }

  let user = await db.user.findUnique({ where: { email: opts.email.toLowerCase() } });
  if (!user) {
    user = await db.user.create({
      data: {
        email: opts.email.toLowerCase(),
        name: opts.name,
        company: opts.company,
        role: "MEMBER",
        status: "PENDING",
        passwordHash: await hashPassword(opts.password ?? crypto.randomUUID()),
      },
    });
  }

  // Automated Companies House cross-check — runs server-side at enrolment
  // (never client-trusted), so the review queue already has an authoritative
  // answer the moment the application appears, not just an uploaded PDF.
  // Also checks the applicant against the company's officers register.
  let chFields = {};
  if (opts.orgNumber && opts.orgName) {
    const check = await checkCompany(opts.orgNumber, opts.orgName, opts.name);
    chFields = {
      chStatus: check.status, chOfficialName: check.officialName,
      chIncorporatedAt: check.incorporatedAt, chNameMatches: check.nameMatches,
      chCheckedAt: new Date(), chSimulated: check.simulated,
      chOfficers: check.officers, chDirectorMatch: check.directorMatch,
    };
  }

  const membership = await db.membership.create({
    data: {
      userId: user.id,
      productId: product.id,
      status: "AWAITING_SIGNATURE",
      createdVia: opts.via,
      salesRepId: opts.salesRepId,
      summitCategoryId: opts.summitCategoryId,
      orgName: opts.orgName,
      orgNumber: opts.orgNumber,
      orgDocs: opts.orgDocs ?? [],
      ...chFields,
      contract: {
        create: { status: "SENT", docHtml: contractHtml(product.name, opts.name) },
      },
    },
  });

  await audit({
    actorId: opts.salesRepId ?? user.id, actorName: opts.name,
    action: "enrolment.start", entityType: "Membership", entityId: membership.id,
    after: { product: product.name, via: opts.via },
  });
  await sendMail(
    user.email,
    `Your ${product.name} agreement is ready to sign`,
    `Hello ${opts.name}, your membership agreement has been generated. Sign it online to continue your enrolment.`
  );

  return { membershipId: membership.id, userId: user.id };
}

/** E-signature completion (simulated provider). AWAITING_SIGNATURE → AWAITING_PAYMENT. */
export async function markSigned(membershipId: string, signerName: string, signerEmail: string) {
  const m = await db.membership.findUniqueOrThrow({
    where: { id: membershipId }, include: { contract: true, product: true, user: true },
  });
  if (m.status !== "AWAITING_SIGNATURE") throw new Error(`Cannot sign from state ${m.status}`);
  // A signature bound to an unproven email address is worthless.
  if (!m.user.emailVerifiedAt) throw new Error("Confirm your email address before signing the agreement.");

  await db.$transaction([
    db.contract.update({
      where: { membershipId },
      data: { status: "SIGNED", signedAt: new Date(), signerName, signerEmail },
    }),
    db.membership.update({ where: { id: membershipId }, data: { status: "AWAITING_PAYMENT" } }),
  ]);
  await audit({
    actorName: signerName, action: "contract.signed",
    entityType: "Membership", entityId: membershipId,
    after: { product: m.product.name, signerName },
  });
  await sendMail(signerEmail, "Contract signed — one step left",
    `Thank you ${signerName}. Your signed agreement is stored on your record. Complete payment to activate your membership.`);
}

async function activate(membershipId: string) {
  const m = await db.membership.findUniqueOrThrow({
    where: { id: membershipId }, include: { user: true, product: true, contract: true },
  });
  if (m.contract?.status !== "SIGNED") throw new Error("Cannot activate before the contract is signed.");

  // Enterprise organisation gate (client change, Jul 13 notes): uploaded org
  // documents must be admin-verified before the account goes live. Signed +
  // paid + docs pending → PENDING_VERIFICATION, and verifyMembership() below
  // re-enters this function once an admin approves.
  const hasOrgDocs = Array.isArray(m.orgDocs) && (m.orgDocs as string[]).length > 0;
  if (hasOrgDocs && !m.verifiedAt) {
    await db.membership.update({ where: { id: membershipId }, data: { status: "PENDING_VERIFICATION" } });
    await audit({
      action: "membership.pending_verification", entityType: "Membership", entityId: membershipId,
      after: { product: m.product.name, member: m.user.name, orgName: m.orgName, docs: (m.orgDocs as string[]).length },
    });
    await sendMail(m.user.email, "Documents received — verification in progress",
      `Hello ${m.user.name}, your agreement is signed and payment confirmed. Your organisation documents are now with our verification team — this is usually completed the same day, and your membership activates the moment it clears.`);
    return;
  }

  const start = new Date();
  let end: Date;
  if (m.product.billing === "ANNUAL") {
    end = new Date(start.getTime() + YEAR_MS);
  } else {
    // Temporary membership: time-limited to its Summit — event date + 7 days (DECISIONS #9).
    const cat = m.summitCategoryId
      ? await db.summitCategory.findUnique({
          where: { id: m.summitCategoryId },
          include: { summit: { include: { event: true } } },
        })
      : null;
    end = cat
      ? new Date(cat.summit.event.startsAt.getTime() + 7 * 24 * 3600 * 1000)
      : new Date(start.getTime() + 30 * 24 * 3600 * 1000);
  }

  await db.$transaction([
    db.membership.update({
      where: { id: membershipId },
      data: { status: "ACTIVE", periodStart: start, periodEnd: end },
    }),
    db.user.update({ where: { id: m.userId }, data: { status: "ACTIVE" } }),
  ]);

  // Temporary members enter the intent-letter workflow the moment they activate.
  if (m.summitCategoryId) {
    await db.slotApplication.upsert({
      where: { categoryId_userId: { categoryId: m.summitCategoryId, userId: m.userId } },
      create: { categoryId: m.summitCategoryId, userId: m.userId, status: "INVITED" },
      update: {},
    });
  }
  await audit({
    action: "membership.activate", entityType: "Membership", entityId: membershipId,
    after: { product: m.product.name, member: m.user.name },
  });
  await sendMail(m.user.email, `Welcome — your ${m.product.name} is active`,
    `Hello ${m.user.name}, your membership is now active. Sign in to your dashboard to explore your benefits.`);
}

/** Admin decision on an organisation's uploaded documents (§verification queue).
 *  Approve → records verifier and completes the normal activation.
 *  Reject → stays PENDING_VERIFICATION with a logged reason; member is emailed. */
export async function verifyMembership(
  membershipId: string,
  decision: "approve" | "reject",
  admin: { id: string; name: string },
  reason?: string,
) {
  const m = await db.membership.findUniqueOrThrow({
    where: { id: membershipId }, include: { user: true, product: true },
  });
  if (m.status !== "PENDING_VERIFICATION") throw new Error(`Membership is ${m.status}, not pending verification.`);

  if (decision === "approve") {
    await db.membership.update({
      where: { id: membershipId },
      data: { verifiedById: admin.id, verifiedAt: new Date(), rejectedReason: null },
    });
    await audit({
      actorId: admin.id, actorName: admin.name, action: "verification.approve",
      entityType: "Membership", entityId: membershipId,
      after: { member: m.user.name, orgName: m.orgName },
    });
    await activate(membershipId); // gate now passes → full activation + welcome email
  } else {
    if (!reason?.trim()) throw new Error("A reason is required to reject verification.");
    await db.membership.update({ where: { id: membershipId }, data: { rejectedReason: reason } });
    await audit({
      actorId: admin.id, actorName: admin.name, action: "verification.reject",
      entityType: "Membership", entityId: membershipId,
      after: { member: m.user.name, orgName: m.orgName }, reason,
    });
    await sendMail(m.user.email, "We need another look at your documents",
      `Hello ${m.user.name}, our verification team reviewed your organisation documents and needs a correction before we can activate your membership: ${reason}. Please reply to this email with the corrected documents, or contact the membership office.`);
  }
}

/** Simulated one-time card payment. AWAITING_PAYMENT → ACTIVE. */
export async function mockCardPayment(membershipId: string) {
  const m = await db.membership.findUniqueOrThrow({
    where: { id: membershipId }, include: { product: true, discount: true },
  });
  if (m.status !== "AWAITING_PAYMENT") throw new Error(`Cannot pay from state ${m.status}`);

  let amount = m.product.priceMinor;
  if (m.discount?.active) {
    amount = m.discount.kind === "PERCENT"
      ? Math.round(amount * (1 - m.discount.value / 100))
      : Math.max(0, amount - m.discount.value);
  }

  // Wallet credits the amount ACTUALLY PAID (DECISIONS #11).
  await credit({
    userId: m.userId, membershipId, type: "CHARGE", amountMinor: amount,
    provider: "MOCK_CARD", reason: `${m.product.name} — full payment (simulated card)`,
  });
  await activate(membershipId);
}

/** Simulated Direct Debit: mandate + first instalment confirms activation. */
export async function startDirectDebit(membershipId: string, months: 3 | 6) {
  const m = await db.membership.findUniqueOrThrow({
    where: { id: membershipId }, include: { product: true },
  });
  if (m.status !== "AWAITING_PAYMENT") throw new Error(`Cannot start Direct Debit from state ${m.status}`);
  if (!m.product.allowsDirectDebit) throw new Error("Direct Debit is not available on this membership.");

  const instalment = Math.ceil(m.product.priceMinor / months);
  await db.paymentPlan.create({
    data: {
      membershipId, months, instalmentMinor: instalment, collected: 1,
      nextCollectionAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
  });
  await credit({
    userId: m.userId, membershipId, type: "INSTALMENT", amountMinor: instalment,
    provider: "MOCK_DD", reason: `Direct Debit instalment 1 of ${months} (simulated Bacs)`,
  });
  await activate(membershipId);
}

/** Collect the next DD instalment (admin/sales demo control, or scheduled). */
export async function collectNextInstalment(membershipId: string, actor?: { id: string; name: string }) {
  const plan = await db.paymentPlan.findUniqueOrThrow({
    where: { membershipId }, include: { membership: { include: { product: true, user: true } } },
  });
  if (plan.status !== "ACTIVE") throw new Error(`Plan is ${plan.status}`);
  if (plan.collected >= plan.months) throw new Error("Plan already fully collected.");

  const n = plan.collected + 1;
  await credit({
    userId: plan.membership.userId, membershipId, type: "INSTALMENT",
    amountMinor: plan.instalmentMinor, provider: "MOCK_DD",
    reason: `Direct Debit instalment ${n} of ${plan.months} (simulated Bacs)`,
    createdById: actor?.id,
  });
  await db.paymentPlan.update({
    where: { membershipId },
    data: {
      collected: n,
      status: n >= plan.months ? "COMPLETE" : "ACTIVE",
      nextCollectionAt: n >= plan.months ? null : new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
  });
  await sendMail(
    plan.membership.user.email,
    `Direct Debit instalment ${n} of ${plan.months} collected`,
    `We have collected £${(plan.instalmentMinor / 100).toFixed(2)} for your ${plan.membership.product.name}.`
  );
}
