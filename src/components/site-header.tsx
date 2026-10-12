"use client";

/**
 * SiteHeader — the landing page's navigation.
 *
 * Over the hero it is transparent with white type, so the film runs edge to
 * edge under the wordmark instead of being capped by a white strip. Once
 * the page has scrolled past ~64px it settles into the solid white bar the
 * rest of the site uses. The flip is a class toggle driven by one passive
 * scroll listener; the styles live in globals.css (`.nav-hero`).
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { LinkButton } from "@/components/ui";
import { MobileNav } from "@/components/mobile-nav";
import { IntroReveal } from "@/components/premium";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 64);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      className={`nav-hero sticky top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ${
        scrolled ? "is-scrolled hairline bg-white/96 backdrop-blur-xs" : "on-dark border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <IntroReveal delay={0.55} y={-14}>
          <Link href="/" className="flex min-h-11 items-center text-sm sm:text-base">
            <Logo size={40} />
          </Link>
        </IntroReveal>
        <IntroReveal delay={0.65} y={-14}>
          <nav className="flex items-center gap-5">
            {/* min-h-11 + flex, not block: on a tablet the hamburger is gone
                (sm:hidden) so these are the whole navigation, and a bare
                text-sm link is only a ~20px-tall tap target. */}
            <Link href="#tiers" className="nav-link hidden min-h-11 items-center text-sm transition-colors sm:flex">Memberships</Link>
            <Link href="/summit" className="nav-link hidden min-h-11 items-center text-sm transition-colors sm:flex">Summit</Link>
            <Link href="/guides" className="nav-link hidden min-h-11 items-center text-sm transition-colors md:flex">Guides</Link>
            <Link href="/login" className="nav-link hidden min-h-11 items-center text-sm transition-colors sm:flex">Member sign in</Link>
            {/* Join pill is hidden on the smallest screens — the drawer's
                full-width CTA replaces it, which also frees the 44px the
                hamburger needs without crowding the logo. */}
            <LinkButton href="/join" size="sm" className="shine hidden sm:inline-flex">Join</LinkButton>
            <MobileNav />
          </nav>
        </IntroReveal>
      </div>
    </header>
  );
}
