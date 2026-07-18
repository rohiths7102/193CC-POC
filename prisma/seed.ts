/**
 * Seed: products + entitlements (client proposal §3), threshold rule (£2,600),
 * settings (DECISIONS defaults), demo users for all 6 roles, and a rich demo
 * dataset so every portal has real data on first login.
 */
import { PrismaClient, Role, SlotKind, SlotStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const db = new PrismaClient();
const PW = bcrypt.hashSync("Demo123!", 10);
const YEAR = 365 * 24 * 3600 * 1000;
const now = new Date();

async function main() {
  // ── Append-only guards on money + audit (DB-level, not just app discipline) ──
  await db.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION '% is append-only', TG_TABLE_NAME; END;
    $$ LANGUAGE plpgsql;
  `);
  for (const t of ['"LedgerEntry"', '"AuditLog"']) {
    await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS append_only ON ${t};`);
    await db.$executeRawUnsafe(
      `CREATE TRIGGER append_only BEFORE UPDATE OR DELETE ON ${t}
       FOR EACH ROW EXECUTE FUNCTION forbid_mutation();`
    );
  }

  // ── Products & entitlements ──
  const individual = await db.product.create({
    data: {
      code: "INDIVIDUAL", name: "Individual Membership",
      strapline: "For entrepreneurs building their network at the highest level.",
      priceMinor: 50000, billing: "ANNUAL", allowsDirectDebit: false, sortOrder: 1,
      entitlements: { create: [
        { key: "main_event_delegate", params: { note: "One Main Event, delegate capacity, House of Lords" } },
        { key: "mentoring_hours", params: { hours: 2, kind: "senior" } },
        { key: "networking_news" },
      ]},
    },
  });
  const entStandard = await db.product.create({
    data: {
      code: "ENT_STANDARD", name: "Enterprise Standard",
      strapline: "Brand, publish and pitch on the UK's most exclusive stage.",
      priceMinor: 350000, billing: "ANNUAL", sortOrder: 2,
      entitlements: { create: [
        { key: "summit_slot", params: { perAnnum: 1 } },
        { key: "branding_video" },
        { key: "article", params: { maxWords: 1400, maxImages: 2 } },
        { key: "mentoring_hours", params: { hours: 5, kind: "enterprise" } },
        { key: "networking_news" },
        { key: "business_model_guidance" },
        { key: "investor_visibility" },
      ]},
    },
  });
  const entInvestor = await db.product.create({
    data: {
      code: "ENT_INVESTOR", name: "Enterprise Investor Ready",
      strapline: "Everything in Standard, tuned for EIS-ready British companies.",
      priceMinor: 900000, billing: "ANNUAL", sortOrder: 3,
      entitlements: { create: [
        { key: "summit_slot", params: { perAnnum: 1 } },
        { key: "branding_video" },
        { key: "article", params: { maxWords: 1400, maxImages: 2 } },
        { key: "mentoring_hours", params: { hours: 5, kind: "investment" } },
        { key: "networking_news" },
        { key: "business_model_guidance" },
        { key: "eis_guidance" },
        { key: "investor_visibility" },
      ]},
    },
  });
  const temporary = await db.product.create({
    data: {
      code: "TEMPORARY", name: "Temporary Membership",
      strapline: "One Summit. One slot. One unforgettable opportunity.",
      priceMinor: 150000, billing: "ONE_TIME", allowsDirectDebit: false, sortOrder: 4,
      entitlements: { create: [
        { key: "summit_slot", params: { perAnnum: 1, singleEvent: true } },
        { key: "networking_news", params: { untilEventEnd: true } },
      ]},
    },
  });

  // ── £2,600 Major-Event rule — Enterprise products qualify (DECISIONS #1) ──
  await db.thresholdRule.create({
    data: {
      name: "Major Event unlock at £2,600",
      benefitKey: "main_event_delegate",
      thresholdMinor: 260000,
      qualifyingProductIds: [entStandard.id, entInvestor.id],
    },
  });

  // ── Settings (DECISIONS defaults) ──
  await db.setting.createMany({ data: [
    { key: "mentoring.rollover_enabled", value: false },
    { key: "summit.waitlist_offer_hours", value: 48 },
    { key: "renewal.grace_days", value: 14 },
    { key: "article.max_words", value: 1400 },
  ]});

  // ── Staff logins ──
  const [admin, sales, mentor, investor, consultant] = await Promise.all([
    db.user.create({ data: { email: "admin@platform.demo", name: "Amelia Hart", role: Role.ADMIN, status: "ACTIVE", passwordHash: PW } }),
    db.user.create({ data: { email: "sales@platform.demo", name: "Sam Okoye", role: Role.SALES_REP, status: "ACTIVE", passwordHash: PW } }),
    db.user.create({ data: { email: "mentor@platform.demo", name: "Dr. Maya Lindqvist", role: Role.MENTOR, status: "ACTIVE", passwordHash: PW } }),
    db.user.create({ data: { email: "investor@platform.demo", name: "Victor Ashworth", role: Role.INVESTOR, status: "ACTIVE", passwordHash: PW } }),
    db.user.create({ data: { email: "consultant@platform.demo", name: "Elena Rossi", role: Role.CONSULTANT, status: "ACTIVE", passwordHash: PW } }),
  ]);

  // ── Members ──
  const alice = await db.user.create({ data: { email: "alice@member.demo", name: "Alice Fairweather", role: Role.MEMBER, status: "ACTIVE", passwordHash: PW } });
  const bruno = await db.user.create({ data: { email: "bruno@acme.demo", name: "Bruno Keller", company: "Acme Regenerative Ltd", role: Role.MEMBER, status: "ACTIVE", passwordHash: PW } });
  const chen  = await db.user.create({ data: { email: "chen@nova.demo",  name: "Chen Wei", company: "Nova Materials PLC", role: Role.MEMBER, status: "ACTIVE", passwordHash: PW } });
  const dora  = await db.user.create({ data: { email: "dora@lumen.demo", name: "Dora Nagy", company: "Lumen Robotics", role: Role.MEMBER, status: "ACTIVE", passwordHash: PW } });

  const contractHtml = (product: string, name: string) => `
    <h2>Membership Agreement — ${product}</h2>
    <p><em>PLACEHOLDER CONTRACT TEXT — final legal wording to be supplied by the client's legal advisor before go-live.</em></p>
    <p>This agreement is entered into between the Membership Body ("the Organisation") and <strong>${name}</strong> ("the Member").</p>
    <p>1. The Member is granted the benefits of the ${product} tier as published at the date of signature.</p>
    <p>2. Fees are payable in advance by card or, where offered, by Direct Debit instalments.</p>
    <p>3. Membership activates only once this agreement is signed and the first payment or Direct Debit mandate is confirmed.</p>
    <p>4. The Organisation processes personal data in accordance with UK GDPR and the Data Protection Act 2018.</p>`;

  const mkActiveMembership = async (user: { id: string; name: string; email: string }, product: { id: string; name: string }, startedDaysAgo: number) => {
    const start = new Date(now.getTime() - startedDaysAgo * 24 * 3600 * 1000);
    return db.membership.create({
      data: {
        userId: user.id, productId: product.id, status: "ACTIVE",
        periodStart: start, periodEnd: new Date(start.getTime() + YEAR),
        contract: { create: {
          status: "SIGNED", signedAt: start, signerName: user.name, signerEmail: user.email,
          docHtml: contractHtml(product.name, user.name),
        }},
      },
    });
  };

  const mAlice = await mkActiveMembership(alice, individual, 40);
  const mBruno = await mkActiveMembership(bruno, entStandard, 120);
  const mChen  = await mkActiveMembership(chen, entInvestor, 20);

  // Alice: single card charge £500
  await db.ledgerEntry.create({ data: {
    userId: alice.id, membershipId: mAlice.id, type: "CHARGE", amountMinor: 50000,
    provider: "MOCK_CARD", reason: "Individual Membership — full payment",
  }});

  // Bruno: 6-month DD plan on £3,500 → 4 instalments collected (~£2,333) — next one crosses £2,600
  const instalment = Math.ceil(350000 / 6);
  await db.paymentPlan.create({ data: {
    membershipId: mBruno.id, months: 6, instalmentMinor: instalment, collected: 4,
    nextCollectionAt: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
  }});
  for (let i = 0; i < 4; i++) {
    await db.ledgerEntry.create({ data: {
      userId: bruno.id, membershipId: mBruno.id, type: "INSTALMENT", amountMinor: instalment,
      provider: "MOCK_DD", reason: `Direct Debit instalment ${i + 1} of 6`,
      createdAt: new Date(now.getTime() - (110 - i * 30) * 24 * 3600 * 1000),
    }});
  }

  // Chen: single card charge £9,000 → already past threshold → unlocked
  const chenEntry = await db.ledgerEntry.create({ data: {
    userId: chen.id, membershipId: mChen.id, type: "CHARGE", amountMinor: 900000,
    provider: "MOCK_CARD", reason: "Enterprise Investor Ready — full payment",
  }});
  const rule = await db.thresholdRule.findFirstOrThrow();
  await db.benefitUnlock.create({ data: {
    userId: chen.id, benefitKey: "main_event_delegate", source: "RULE",
    ruleId: rule.id, ledgerEntryId: chenEntry.id,
  }});

  // ── Events: Main Event + Summit 23 July 2026 with 3×15 categories ──
  await db.event.create({ data: {
    kind: "MAIN_EVENT", name: "House of Lords Reception — Autumn 2026",
    venue: "House of Lords, UK Parliament, London", startsAt: new Date("2026-10-15T18:00:00Z"), capacity: 120,
  }});
  const summitEvent = await db.event.create({ data: {
    kind: "SUMMIT", name: "UK Investors Summit — Summer 2026",
    venue: "One Great George Street, Westminster, London", startsAt: new Date("2026-07-23T09:00:00Z"),
    summit: { create: {
      deadlineAt: new Date("2026-07-18T17:00:00Z"),
      categories: { create: [
        { kind: SlotKind.PRESENTATION, capacity: 15 },
        { kind: SlotKind.BRAND_LAUNCH, capacity: 15 },
        { kind: SlotKind.AWARD, capacity: 15 },
      ]},
    }},
  }, include: { summit: { include: { categories: true } } }});
  const cats = summitEvent.summit!.categories;
  const catOf = (k: SlotKind) => cats.find((c) => c.kind === k)!;

  // Dora: Temporary membership, intent submitted for Brand Launch
  const mDora = await db.membership.create({ data: {
    userId: dora.id, productId: temporary.id, status: "ACTIVE",
    periodStart: new Date(now.getTime() - 5 * 24 * 3600 * 1000),
    periodEnd: new Date("2026-07-30T23:59:59Z"), // event + 7 days (DECISIONS #9)
    contract: { create: { status: "SIGNED", signedAt: new Date(now.getTime() - 5 * 24 * 3600 * 1000), signerName: dora.name, signerEmail: dora.email, docHtml: contractHtml("Temporary Membership", dora.name) } },
  }});
  await db.ledgerEntry.create({ data: {
    userId: dora.id, membershipId: mDora.id, type: "CHARGE", amountMinor: 150000,
    provider: "MOCK_CARD", reason: "Temporary Membership — Summit slot",
  }});
  await db.slotApplication.create({ data: {
    categoryId: catOf(SlotKind.BRAND_LAUNCH).id, userId: dora.id,
    status: SlotStatus.INTENT_SUBMITTED, submittedAt: new Date(now.getTime() - 4 * 24 * 3600 * 1000),
  }});

  // Bruno invited for a Presentation slot (his Enterprise summit_slot benefit)
  await db.slotApplication.create({ data: {
    categoryId: catOf(SlotKind.PRESENTATION).id, userId: bruno.id, status: SlotStatus.INVITED,
  }});
  // Chen confirmed for an Award
  await db.slotApplication.create({ data: {
    categoryId: catOf(SlotKind.AWARD).id, userId: chen.id, status: SlotStatus.CONFIRMED,
    submittedAt: new Date(now.getTime() - 10 * 24 * 3600 * 1000), decidedById: admin.id,
  }});
  // Fill BRAND_LAUNCH to capacity with synthetic confirmed applicants + 2 waitlisted → waitlist demo
  for (let i = 1; i <= 14; i++) {
    const u = await db.user.create({ data: {
      email: `launch${i}@applicants.demo`, name: `Launch Applicant ${i}`,
      company: `Venture ${i} Ltd`, role: Role.MEMBER, status: "ACTIVE", passwordHash: PW,
    }});
    await db.slotApplication.create({ data: {
      categoryId: catOf(SlotKind.BRAND_LAUNCH).id, userId: u.id, status: SlotStatus.CONFIRMED,
      submittedAt: new Date(now.getTime() - i * 3600 * 1000), decidedById: admin.id,
    }});
  }
  for (let i = 1; i <= 2; i++) {
    const u = await db.user.create({ data: {
      email: `waitlist${i}@applicants.demo`, name: `Waitlisted Applicant ${i}`,
      company: `Horizon ${i} Ltd`, role: Role.MEMBER, status: "ACTIVE", passwordHash: PW,
    }});
    await db.slotApplication.create({ data: {
      categoryId: catOf(SlotKind.BRAND_LAUNCH).id, userId: u.id, status: SlotStatus.WAITLISTED,
      submittedAt: new Date(now.getTime() - i * 1800 * 1000), waitlistPos: i,
    }});
  }

  // ── Mentoring ──
  const aMentorAlice = await db.mentorAssignment.create({ data: { mentorId: mentor.id, memberId: alice.id, kind: "senior" } });
  const aConsBruno   = await db.mentorAssignment.create({ data: { mentorId: consultant.id, memberId: bruno.id, kind: "enterprise" } });
  await db.mentorAssignment.create({ data: { mentorId: mentor.id, memberId: chen.id, kind: "investment" } });
  await db.mentoringSession.createMany({ data: [
    { assignmentId: aMentorAlice.id, scheduledAt: new Date(now.getTime() - 12 * 24 * 3600 * 1000), durationMin: 60, status: "DELIVERED", notes: "Business plan review; agreed Q3 targets.", loggedById: mentor.id },
    { assignmentId: aMentorAlice.id, scheduledAt: new Date(now.getTime() + 6 * 24 * 3600 * 1000), durationMin: 60, status: "BOOKED", loggedById: alice.id },
    { assignmentId: aConsBruno.id, scheduledAt: new Date(now.getTime() - 8 * 24 * 3600 * 1000), durationMin: 120, status: "DELIVERED", notes: "Franchise model workshop, part 1.", loggedById: consultant.id },
  ]});

  // ── Content ──
  await db.article.create({ data: {
    memberId: bruno.id, title: "How Acme Regenerative is rebuilding UK supply chains",
    body: Array(180).fill("Acme Regenerative combines circular manufacturing with regional partnerships to cut logistics emissions.").join(" "),
    wordCount: 1240, status: "SUBMITTED", images: [],
  }});
  await db.videoTask.create({ data: {
    memberId: bruno.id, status: "BRIEF_SUBMITTED",
    brief: "Feature Acme's Manchester facility; interview CEO Bruno Keller with a CXO of the 193 Countries Consortium; 3-minute cut for the website.",
  }});

  // ── Deal-flow ──
  const pitch = await db.pitch.create({ data: {
    memberId: chen.id, title: "Nova Materials — Series A",
    summary: "Graphene-composite battery casings; 3 UK gigafactory LOIs; seeking £4M at EIS-qualifying terms.",
    materials: [], visibilityConsent: true,
  }});
  await db.investorInterest.create({ data: { pitchId: pitch.id, investorId: investor.id, note: "Strong fit for our advanced-materials thesis. Requesting data room." } });
  await db.pitch.create({ data: {
    memberId: bruno.id, title: "Acme Regenerative — growth round",
    summary: "Circular manufacturing platform, £1.2M ARR, expanding to 3 new regions.",
    materials: [], visibilityConsent: false, // consent OFF → invisible to investors (deny-proof)
  }});

  // ── CRM ──
  await db.lead.createMany({ data: [
    { salesRepId: sales.id, name: "Priya Sharma", email: "priya@brightloop.co.uk", company: "Brightloop", stage: "QUALIFIED", notes: "Wants Enterprise Standard; asked about instalments." },
    { salesRepId: sales.id, name: "Tom Ellery", email: "tom@ellery.ventures", company: "Ellery Ventures", stage: "CONTACTED" },
    { salesRepId: sales.id, name: "Grace Obi", email: "grace@obi-group.com", company: "Obi Group", stage: "NEW" },
  ]});
  await db.discount.create({ data: { code: "FOUNDING10", kind: "PERCENT", value: 10, approvedById: admin.id } });

  // ── A few outbox emails + audit rows so those consoles aren't empty ──
  await db.emailOutbox.createMany({ data: [
    { toEmail: bruno.email, subject: "Direct Debit instalment 4 of 6 collected", body: "We have collected £583.34. Your credit balance is £2,333.36." },
    { toEmail: dora.email, subject: "Intent letter received — UK Investors Summit", body: "Your Brand Launch intent letter was received before the deadline of 18 July 2026, 17:00." },
  ]});
  await db.auditLog.createMany({ data: [
    { actorId: admin.id, actorName: admin.name, action: "slot.confirm", entityType: "SlotApplication", entityId: "seed", after: { member: chen.name, category: "AWARD" } },
    { actorId: sales.id, actorName: sales.name, action: "lead.create", entityType: "Lead", entityId: "seed", after: { name: "Priya Sharma" } },
  ]});

  console.log("Seed complete.");
  console.log("Logins (password Demo123!): admin@platform.demo, sales@platform.demo, mentor@platform.demo, investor@platform.demo, consultant@platform.demo, alice@member.demo, bruno@acme.demo, chen@nova.demo, dora@lumen.demo");
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
