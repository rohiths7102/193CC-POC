import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GlassCard } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { LoginForm } from "@/components/forms";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <div className="aurora animate-aurora left-[10%] top-[10%] h-80 w-80 bg-ink-600" />
        <div className="aurora animate-aurora right-[-10%] bottom-[15%] h-72 w-72 bg-gold-700/50 [animation-delay:-8s]" />
      </div>
      <Link href="/" className="relative z-10 mb-8 inline-flex items-center gap-2 text-sm text-mist hover:text-ivory-100">
        <ArrowLeft className="h-4 w-4" /> Back to site
      </Link>
      <Reveal>
        <div className="relative z-10 mb-8 flex justify-center">
          <Logo size={56} stacked className="text-lg" />
        </div>
        <GlassCard strong className="relative z-10 p-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl text-ivory-50">Member sign in</h1>
            <p className="mt-1 text-xs text-mist">One door for members, admins, sales, mentors, investors and consultants.</p>
          </div>
          <LoginForm />
        </GlassCard>
      </Reveal>
      {/* Demo credentials are shown ONLY on local machines. On any deployed
          host they stay hidden so a public URL doesn't hand out admin access. */}
      {process.env.SHOW_DEMO_LOGINS === "true" && (
        <p className="relative z-10 mt-6 text-center text-xs leading-5 text-mist/70">
          Demo logins · password <code className="text-gold-300">Demo123!</code><br />
          admin@platform.demo · sales@platform.demo · mentor@platform.demo<br />
          investor@platform.demo · consultant@platform.demo · alice@member.demo · bruno@acme.demo
        </p>
      )}
    </main>
  );
}
