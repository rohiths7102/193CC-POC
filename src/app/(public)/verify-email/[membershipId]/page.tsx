import { notFound, redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { can } from "@/server/rbac";
import { GlassCard, DemoTag } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { Steps } from "@/components/steps";
import { EmailCodeForm } from "@/components/forms";
import { PublicHeader, PublicFooter } from "@/components/public-chrome";

export const dynamic = "force-dynamic";

// PII page (masked email, verification state) — must never be indexed.
export const metadata = { robots: { index: false, follow: false } };

/** Step 2 of enrolment: prove the applicant owns the email address before
 *  any agreement is signed in their name. */
export default async function VerifyEmailPage({ params }: { params: Promise<{ membershipId: string }> }) {
  const { membershipId } = await params;
  const m = await db.membership.findUnique({
    where: { id: membershipId }, include: { user: true, product: true },
  });
  if (!m) notFound();
  if (m.user.emailVerifiedAt) redirect(`/sign/${m.id}`);

  // Demo affordance for STAFF phone enrolments: without a real mail provider
  // the code only exists in the outbox, and sales reps cannot open the
  // admin-only Email log — so show it inline to the enrolling staff member.
  // Members never see this (role gate), and it disappears entirely the
  // moment real delivery (Postmark) is configured.
  const viewer = await currentUser();
  const staffDemoCode =
    viewer && can(viewer.role, "enrol_members") && !process.env.POSTMARK_SERVER_TOKEN
      ? m.user.emailCode
      : null;

  // Mask the address: r••••@gmail.com
  const [local, domain] = m.user.email.split("@");
  const masked = `${local.slice(0, 1)}${"•".repeat(Math.max(3, local.length - 1))}@${domain}`;

  return (
    <div className="flex min-h-svh flex-col">
    <PublicHeader />
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
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
        <GlassCard strong className="mt-8 p-8">
          <EmailCodeForm membershipId={m.id} />
          {staffDemoCode && (
            <p className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
              Staff view (demo delivery): this applicant's code is{" "}
              <code className="font-mono text-base tracking-[0.3em] text-amber-100">{staffDemoCode}</code>
            </p>
          )}
          <p className="mt-5 flex items-center gap-2 border-t hairline pt-4 text-xs text-mist">
            <DemoTag>Demo</DemoTag>
            {staffDemoCode
              ? "Real delivery starts the moment a Postmark token is configured — this staff view then disappears."
              : "Admins can read the code in the Email log — no real inbox needed."}
          </p>
        </GlassCard>
      </Reveal>
    </main>
    <PublicFooter />
    </div>
  );
}
