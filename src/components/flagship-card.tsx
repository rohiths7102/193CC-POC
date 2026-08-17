"use client";

/**
 * FlagshipCard — the flagship tier as a single composed object.
 *
 * Structurally this is the reference site's product card (dark container,
 * curved media mask left, badge/title/spec-panel/action-bar right, the action
 * bar breaking the container edge with a negative margin) transposed onto the
 * Enterprise Investor Ready tier. Every value on it is real: the price,
 * billing and entitlements come from the same DB row the /join page renders,
 * the media is the client's own Summit film, the credentials are the ones
 * evidenced elsewhere on the site. Nothing is stock, nothing is placeholder.
 *
 * Motion (all transform/clip, compositor-only, reduced-motion aware):
 *   • clip-path inset wipe, bottom → top, once, when 25% is in view
 *   • the media breathes: 1 → 1.035 over 15s, alternating, forever
 *   • CTA carries the site's Magnetic + shine treatments
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Landmark, ShieldCheck, Crown } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { Magnetic } from "@/components/premium";
import { EASE } from "@/components/premium";

type Entitlement = { id: string; label: string };

export function FlagshipCard({
  name, strapline, price, billing, code, entitlements, filmSrc,
}: {
  name: string;
  strapline: string;
  price: string;
  billing: string;
  code: string;
  entitlements: Entitlement[];
  filmSrc: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  // Drive the clip via a class, not a framer style: the initial clipped
  // state has to exist in the SSR HTML (see .clip-reveal in globals.css) or
  // the card flashes fully-drawn for a frame before hydration.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { if (inView) setRevealed(true); }, [inView]);
  // Belt to the observer's braces: a clip that never lifts is a hidden price
  // and a hidden CTA. If IntersectionObserver is unavailable, throttled, or
  // simply never delivers (some embedded/background contexts), a plain
  // geometry check on scroll/resize lifts it; and nothing on the page stays
  // clipped past 6s regardless.
  useEffect(() => {
    if (revealed) return;
    const check = () => {
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.85 && r.bottom > 0) setRevealed(true);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    const cap = setTimeout(() => setRevealed(true), 6000);
    return () => { window.removeEventListener("scroll", check); window.removeEventListener("resize", check); clearTimeout(cap); };
  }, [revealed]);

  return (
    <div ref={ref} className={`clip-reveal ${revealed ? "is-in" : ""}`}>
      <div className="on-dark matte-noise gradient-border-inset relative flex flex-col overflow-hidden rounded-[28px] bg-navy-deep text-white lg:flex-row lg:rounded-[40px]">

        {/* ── Media column ─────────────────────────────────────────────── */}
        <div className="curve-media relative min-h-[300px] flex-1 lg:min-h-[560px]">
          {filmSrc ? (
            // Poster-only use of the client's real film: `preload=metadata`
            // pulls one frame and stops — no autoplay, no decode loop, no
            // second video element competing with the hero's.
            <video
              className="animate-slow-pulse absolute inset-0 h-full w-full object-cover"
              src={`${filmSrc}#t=4`}
              poster="/videos/summit-poster-2.jpg"
              preload="metadata"
              muted
              playsInline
              aria-hidden
              tabIndex={-1}
            />
          ) : (
            <div className="animate-slow-pulse absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_10%,#3a4664_0%,#232a42_45%,#161b2c_100%)]" />
          )}
          {/* scrim: heavier at the foot where the credential chips sit */}
          <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/30 to-transparent" />

          {/* Credentials — the reference stacks three overlapping avatars
              here as social proof. We have no members' faces to show and
              would not fabricate them; the proof this tier actually carries
              is institutional, so that is what overlaps here. */}
          <div className="absolute inset-x-6 bottom-6 flex flex-wrap items-end gap-3 lg:inset-x-8 lg:bottom-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-medium tracking-wide backdrop-blur-md">
              <Landmark className="h-3.5 w-3.5 text-gold-300" /> House of Lords · UK Parliament
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-medium tracking-wide backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5 text-gold-300" /> Companies House 14499310
            </span>
          </div>
        </div>

        {/* ── Content column ───────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-1 flex-col justify-between p-7 sm:p-10 lg:p-12 lg:pl-14">
          <div>
            <div className="flex items-center justify-between gap-4">
              <span className="kicker">Flagship tier</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-300/40 bg-gold-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-300">
                <Crown className="h-3 w-3" /> Investor ready
              </span>
            </div>

            <h3 className="mt-6 font-display text-[40px] font-thin leading-[1.02] sm:text-[52px] lg:text-[60px]">
              {name}
            </h3>
            <p className="mt-4 max-w-md text-[15px] leading-[1.7] text-white/70 sm:text-base">{strapline}</p>

            {/* Spec panel — the reference's olive panel, in navy-soft. Real
                entitlements from the DB row, two columns from sm. */}
            <div className="mt-8 rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10 sm:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">What activates</p>
              <ul className="mt-4 grid gap-x-6 gap-y-2.5 text-[13.5px] leading-snug text-white/85 sm:grid-cols-2">
                {entitlements.map((e) => (
                  <li key={e.id} className="flex gap-2.5">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
                    {e.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action bar — the reference's beige price bar, breaking the
              container's left edge on desktop with ml-[-3rem] so it reads as
              a plate laid ACROSS the card rather than a row inside it. Cream
              on navy: the one warm surface in the composition. */}
          <div className="on-light is-light gradient-border-inset relative z-20 mt-8 flex flex-col gap-4 rounded-2xl bg-[#F6F1E7] p-5 text-ivory-50 sm:flex-row sm:items-center sm:justify-between sm:p-6 lg:-ml-12 lg:mt-10">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ivory-300">Annual membership</p>
              <p className="mt-1 font-display text-[40px] font-thin leading-none text-ivory-50">
                {price}
                <span className="ml-2 font-sans text-sm font-normal text-ivory-300">{billing}</span>
              </p>
            </div>
            <Magnetic>
              <LinkButton href={`/join/${code}`} size="lg" className="shine w-full sm:w-auto">
                Join now <ArrowRight className="h-4 w-4" />
              </LinkButton>
            </Magnetic>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Re-export so the page can pull one import for its motion needs. */
export { EASE, motion };
