import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GlassCard } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { LoginForm } from "@/components/forms";
import { Logo } from "@/components/logo";
import { NetworkCanvas } from "@/components/showcase";

// A members-only door has no search value — keep it out of the index.
export const metadata = { title: "Member Sign In", robots: { index: false, follow: true } };

export default function LoginPage() {
  return (
    <main className="relative mx-auto flex min-h-svh max-w-md flex-col justify-center px-5 py-8 sm:px-6 sm:py-16">
      {/* Living constellation — the network-globe motif, drifting behind the door */}
      <NetworkCanvas className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-60" />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="aurora animate-aurora left-[10%] top-[10%] h-80 w-80 bg-ink-600" />
        <div className="aurora animate-aurora right-[-10%] bottom-[15%] h-72 w-72 bg-gold-700/50 [animation-delay:-8s]" />
      </div>
      {/* /login renders no PublicHeader, so this is the page's only exit. */}
      <Link href="/" className="relative z-10 mb-8 inline-flex min-h-11 items-center gap-2 text-sm text-mist hover:text-ivory-100 lg:min-h-0">
        <ArrowLeft className="h-4 w-4" /> Back to site
      </Link>
      <Reveal>
        <div className="relative z-10 mb-8 flex justify-center">
          <Logo size={56} stacked className="text-lg" />
        </div>
        <div className="card-flagship relative z-10 rounded-2xl">
          <GlassCard strong className="p-6 sm:p-8">
            <div className="mb-6 text-center">
              <h1 className="font-display text-2xl text-ivory-50">Member sign in</h1>
              <p className="mt-1.5 text-xs leading-5 text-mist">One door for members, admins, sales, mentors, investors and consultants.</p>
            </div>
            <LoginForm />
            <p className="mt-5 border-t hairline pt-4 text-center text-xs text-mist">
              Not a member yet?{" "}
              <Link href="/join" className="text-gold-300 underline decoration-gold-500/40 underline-offset-2 hover:text-gold-200">
                Become a member
              </Link>
            </p>
          </GlassCard>
        </div>
      </Reveal>
      {/* Demo credentials are shown ONLY on local machines. On any deployed
          host they stay hidden so a public URL doesn't hand out admin access. */}
      {process.env.SHOW_DEMO_LOGINS === "true" && (
        <p className="relative z-10 mt-6 text-center text-xs leading-5 text-mist">
          Demo logins · password <code className="text-gold-300">Demo123!</code><br />
          admin@platform.demo · sales@platform.demo · mentor@platform.demo<br />
          investor@platform.demo · consultant@platform.demo · alice@member.demo · bruno@acme.demo
        </p>
      )}
    </main>
  );
}
