"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { EASE } from "@/components/premium";

/**
 * Public-site mobile navigation.
 *
 * Before this existed the phone header rendered only the logo and a "Join"
 * pill — Memberships, Summit, Guides and Member sign in were all unreachable
 * below 640px, with no hamburger anywhere on the public site. The portal had a
 * drawer; the marketing site did not.
 *
 * Deliberately a full-screen panel rather than a dropdown: at 375px a
 * dropdown gives cramped 20px rows, while a full panel affords 56px targets
 * and reads as intentional rather than as a shrunken desktop menu.
 */

const LINKS: { href: string; label: string; note: string }[] = [
  { href: "/join", label: "Memberships", note: "Four tiers, £500–£9,000" },
  { href: "/summit", label: "UK Investors Summit", note: "45 slots, three stages" },
  { href: "/events/house-of-lords", label: "House of Lords events", note: "What to expect" },
  { href: "/guides", label: "Guides", note: "Investor readiness & more" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close if the viewport grows past the sm breakpoint. Without this, rotating
  // a phone to landscape hides both the panel and its close button (they are
  // sm:hidden) while `open` stays true — leaving the page permanently
  // scroll-locked with no way to recover.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => { if (mq.matches) setOpen(false); };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Lock background scroll while the panel is open, and restore on close.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        // 44x44 minimum touch target (WCAG 2.5.5 / Apple HIG)
        className="-mr-2 flex h-11 w-11 items-center justify-center rounded-xl text-ivory-100 transition-colors hover:bg-ink-700/50 sm:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Portalled to <body>. The header wraps this in framer-motion's
          IntroReveal, which sets a `transform` — and a transformed ancestor
          becomes the containing block for fixed-position descendants, so
          `fixed inset-0` was resolving against a 44x36 box instead of the
          viewport. The portal escapes that entirely. */}
      {mounted && createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-70 bg-white sm:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-6 py-4">
                <Link href="/" onClick={() => setOpen(false)} className="flex min-h-11 items-center text-sm">
                  <Logo size={36} />
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="-mr-2 flex h-11 w-11 items-center justify-center rounded-xl text-ivory-100 transition-colors hover:bg-ink-700/50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-6 pt-4">
                <ul className="divide-y divide-line">
                  {LINKS.map((l, i) => (
                    <motion.li
                      key={l.href}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.05 + i * 0.05, ease: EASE }}
                    >
                      <Link
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className="flex min-h-[64px] items-center justify-between gap-4 py-4"
                      >
                        <span>
                          <span className="block font-display text-xl leading-snug text-ivory-50">{l.label}</span>
                          <span className="mt-0.5 block text-xs text-mist">{l.note}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-gold-500" />
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </nav>

              <div className="space-y-3 border-t hairline px-6 py-6">
                <Link
                  href="/join"
                  onClick={() => setOpen(false)}
                  className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-linear-to-r from-gold-400 to-gold-600 px-6 text-sm font-medium text-ink-950"
                >
                  Become a member <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex min-h-[52px] w-full items-center justify-center rounded-full border border-line px-6 text-sm text-ivory-100"
                >
                  Member sign in
                </Link>
                <p className="pt-1 text-center text-[10px] uppercase tracking-[0.3em] text-mist">
                  Membership is by application
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
}
