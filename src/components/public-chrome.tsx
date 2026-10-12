import Link from "next/link";
import { Logo } from "@/components/logo";
import { LinkButton } from "@/components/ui";
import { MobileNav } from "@/components/mobile-nav";

/**
 * Shared chrome for public sub-pages (enrolment funnel, privacy, errors).
 * The landing page keeps its own rich header/footer; every OTHER public page
 * previously rendered no brand mark and no footer at all — a naked form on a
 * dark screen. These are deliberately minimal: identity + one legal row.
 */

export function PublicHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
      {/* min-h-11 gives the logo link a 44px touch target on phones. */}
      <Link href="/" className="flex min-h-11 items-center text-sm"><Logo size={40} /></Link>
      <div className="flex items-center gap-5">
        <LinkButton href="/join" size="sm" className="shine hidden sm:inline-flex">Join</LinkButton>
        <MobileNav />
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t hairline">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-mist">
        <span>© 2026 193 Countries Consortium · Companies House 14499310</span>
        <Link href="/privacy" className="inline-flex min-h-11 items-center underline decoration-gold-500/40 underline-offset-2 transition-colors hover:text-ivory-100">
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
