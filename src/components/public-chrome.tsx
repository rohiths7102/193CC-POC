import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

/**
 * Shared chrome for public sub-pages (enrolment funnel, privacy, errors).
 * The landing page keeps its own rich header/footer; every OTHER public page
 * previously rendered no brand mark and no footer at all — a naked form on a
 * dark screen. These are deliberately minimal: identity + one legal row.
 */

/** One header across the public site — the homepage's (ADR-0031). */
export function PublicHeader() {
  return <SiteHeader />;
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
