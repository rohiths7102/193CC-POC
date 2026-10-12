import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GlassCard } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { LoginForm } from "@/components/forms";
import { Logo } from "@/components/logo";
import Image from "next/image";

// A members-only door has no search value — keep it out of the index.
export const metadata = { title: "Member Sign In", robots: { index: false, follow: true } };

export default function LoginPage() {
  return (
    <main className="relative mx-auto flex min-h-svh max-w-md flex-col justify-center px-5 py-8 sm:px-6 sm:py-16">
      {/* The Palace at dusk behind the door, dimmed into the Lords palette. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20">
        <Image src="/images/westminster-dusk.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-linear-to-b from-night/70 via-paper/70 to-night/95" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_45%,var(--chamber)_0%,transparent_70%)] opacity-40" />
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
              <h1 className="font-headline text-4xl text-ivory-50">Member <em className="text-gilt">sign in</em></h1>
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
