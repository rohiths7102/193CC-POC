/** One-off demo seed for the Jul-13 client changes (run once with tsx):
 *  - Chen gets a PUBLIC profile at /profile/nova-materials
 *  - A new Enterprise applicant sits in the admin Verification queue
 *  Safe to re-run: guarded by existence checks. */
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import path from "path";

const db = new PrismaClient();

async function main() {
  // 1. Chen — public profile
  await db.user.update({
    where: { email: "chen@nova.demo" },
    data: {
      profileSlug: "nova-materials",
      profilePublic: true,
      profileBio:
        "Nova Materials engineers graphene-composite battery casings for the UK's gigafactory supply chain. " +
        "Enterprise Investor Ready member of the 193 Countries Consortium, presenting at the UK Investors Summit.",
    },
  });
  console.log("chen profile → /profile/nova-materials (public)");

  // 2. Pending-verification demo applicant
  const email = "fatima@brightpath.demo";
  if (!(await db.user.findUnique({ where: { email } }))) {
    const storage = path.join(process.cwd(), "storage");
    mkdirSync(storage, { recursive: true });
    const docKey = "orgdoc-demo-brightpath-certificate.pdf";
    if (!existsSync(path.join(storage, docKey))) {
      writeFileSync(path.join(storage, docKey),
        "%PDF-1.4\n% Demo certificate of incorporation — Brightpath Exports Ltd (placeholder document)\n%%EOF\n");
    }

    const product = await db.product.findUniqueOrThrow({ where: { code: "ENT_STANDARD" } });
    const user = await db.user.create({
      data: {
        email, name: "Fatima Noor", company: "Brightpath Exports Ltd",
        role: "MEMBER", status: "PENDING", passwordHash: bcrypt.hashSync("Demo123!", 10),
      },
    });
    const m = await db.membership.create({
      data: {
        userId: user.id, productId: product.id, status: "PENDING_VERIFICATION",
        orgName: "Brightpath Exports Ltd", orgNumber: "09812345",
        orgDocs: [docKey],
        contract: { create: {
          status: "SIGNED", signedAt: new Date(), signerName: user.name, signerEmail: email,
          docHtml: `<h2>Membership Agreement — ${product.name}</h2><p><em>PLACEHOLDER CONTRACT TEXT.</em></p><p>Between the Organisation and <strong>${user.name}</strong>.</p>`,
        } },
      },
    });
    await db.ledgerEntry.create({
      data: {
        userId: user.id, membershipId: m.id, type: "CHARGE", amountMinor: product.priceMinor,
        provider: "MOCK_CARD", reason: `${product.name} — full payment (simulated card)`,
      },
    });
    console.log("fatima@brightpath.demo → signed + paid, awaiting verification");
  } else {
    console.log("fatima already exists — skipped");
  }
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
