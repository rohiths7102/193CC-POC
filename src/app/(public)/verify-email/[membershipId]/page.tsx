import { notFound, redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { db } from "@/server/db";
import { GlassCard, DemoTag } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { Steps } from "@/components/steps";
import { EmailCodeForm } from "@/components/forms";

export const dynamic = "force-dynamic";

/** Step 2 of enrolment: prove the applicant owns the email address before
 *  any agreement is signed in their name. */
export default async function VerifyEmailPage({ params }: { params: Promise<{ membershipId: string }> }) {
  const { membershipId } = await params;
  const m = await db.membership.findUnique({
    where: { id: membershipId }, include: { user: true, product: true },
  });
  if (!m) notFound();
  if (m.user.emailVerifiedAt) redirect(`/sign/${m.id}`);

  // Mask the address: r••••@gmail.com
  const [local, domain] = m.user.email.split("@");
  const masked = `${local.slice(0, 1)}${"•".repeat(Math.max(3, local.length - 1))}@${domain}`;

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <Steps current={2} />
      <Reveal>
        <div className="mt-8 flex items-center gap-3">
          <MailCheck className="h-6 w-6 text-gold-400" />
          <h1 className="font-display text-3xl text-ivory-50">Confirm your email</h1>
        </div>
        <p className="mt-2 text-sm leading-6 text-mist">
          We've sent a 6-digit code to <span className="text-ivory-100">{masked}</span>. Entering it proves the address
          is yours — your membership agreement and all event correspondence go there.
        </p>
      </Reveal>
      <Reveal delay={0.1}>
        <GlassCard strong className="mt-8 p-7">
          <EmailCodeForm membershipId={m.id} />
          <p className="mt-5 flex items-center gap-2 border-t hairline pt-4 text-xs text-mist">
            <DemoTag>Demo</DemoTag>
            Staff can read the code in the admin Email log — no real inbox needed.
          </p>
        </GlassCard>
      </Reveal>
    </main>
  );
}
