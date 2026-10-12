import { notFound, redirect } from "next/navigation";
import { FileSignature } from "lucide-react";
import { db } from "@/server/db";
import { GlassCard, Badge } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { SignForm } from "@/components/forms";
import { Steps } from "@/components/steps";
import { PublicHeader, PublicFooter } from "@/components/public-chrome";

export const dynamic = "force-dynamic";

// PII page (applicant name, email, contract) — must never be indexed.
export const metadata = { robots: { index: false, follow: false } };

export default async function SignPage({ params }: { params: Promise<{ membershipId: string }> }) {
  const { membershipId } = await params;
  const m = await db.membership.findUnique({
    where: { id: membershipId },
    include: { contract: true, product: true, user: true },
  });
  if (!m || !m.contract) notFound();
  if (m.status === "AWAITING_PAYMENT") redirect(`/pay/${m.id}`);
  if (m.status !== "AWAITING_SIGNATURE") redirect(`/status/${m.id}`);
  // A signature bound to an unproven address is worthless — route to the
  // email-confirmation step first rather than dead-ending at sign time.
  if (!m.user.emailVerifiedAt) redirect(`/verify-email/${m.id}`);

  return (
    <div className="flex min-h-svh flex-col">
    <PublicHeader />
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <Steps current={3} />
      <Reveal>
        {/* flex-wrap + an atomic chip: at 375px all three items shrank to
            min-content, crushing the h1 and turning the tier name into a
            three-line pill whose caps collided with its own rounded edge. */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <FileSignature className="h-6 w-6 shrink-0 text-gold-400" />
          <h1 className="font-display text-3xl text-ivory-50">Sign your agreement</h1>
          <Badge tone="blue" className="shrink-0 whitespace-nowrap">{m.product.name}</Badge>
        </div>
        <p className="mt-2 text-sm text-mist">
          For {m.user.name} · {m.user.email}. Your account activates only after signature <em className="text-gold-400 not-italic">and</em> payment.
        </p>
      </Reveal>
      <Reveal delay={0.1}>
        <GlassCard className="contract-doc mt-8 max-h-[420px] overflow-y-auto p-8"
          // data-lenis-prevent: the smooth-scroll wrapper must not swallow
          // wheel events over this nested scroller — the applicant has to be
          // able to actually read the agreement they are signing.
          data-lenis-prevent=""
          // Contract HTML is generated server-side from our own template — not user input.
          dangerouslySetInnerHTML={{ __html: m.contract.docHtml }}
        />
      </Reveal>
      <Reveal delay={0.18}>
        <div className="card-flagship mt-6 rounded-2xl">
          <GlassCard strong className="p-8">
            <SignForm membershipId={m.id} />
          </GlassCard>
        </div>
      </Reveal>
    </main>
    <PublicFooter />
    </div>
  );
}
