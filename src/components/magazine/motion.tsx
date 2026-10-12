"use client";

/**
 * Editorial motion primitives (framer-motion — ADR-0028).
 *
 * Every primitive marks its node `data-reveal` so the <noscript> rule in
 * `MagazineMotion` can show it when JavaScript is off; reduced motion is
 * handled once by `MotionConfig reducedMotion="user"`, which drops the
 * transforms and keeps the fades — no server/client markup branch.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  MotionConfig,
  animate,
  motion,
  useInView,
  useScroll,
  useTransform,
} from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

export function MagazineMotion({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <noscript>
        <style>{`[data-reveal]{opacity:1!important;transform:none!important;clip-path:none!important}`}</style>
      </noscript>
      {children}
    </MotionConfig>
  );
}

/** Fade + rise once, when a quarter of it is on screen. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      data-reveal
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Headline set line by line, each line rising out of its own mask.
 *
 * The in-view trigger sits on the WRAPPER, not the lines: a line starts fully
 * below its overflow-hidden mask, so an observer on the line itself reports 0%
 * visible and never fires. The wrapper is on screen; it drives the lines
 * through variants.
 */
export function MaskedLines({
  lines,
  className,
  lineClassName,
  delay = 0,
  as = "h2",
}: {
  lines: ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  as?: "h1" | "h2" | "p";
}) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.4 }}
      transition={{ staggerChildren: 0.09, delayChildren: delay }}
    >
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <motion.span
            data-reveal
            className={`block ${lineClassName ?? ""}`}
            variants={{ hidden: { y: "105%" }, shown: { y: "0%" } }}
            transition={{ duration: 1.1, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/**
 * Photograph that wipes up from the bottom edge and settles from a slight zoom.
 *
 * The observer sits on an UNCLIPPED wrapper: Chrome counts a target's own
 * clip-path in IntersectionObserver, so an element starting at
 * inset(100%) reads as 0% visible and could never trigger its own reveal.
 */
export function ImageReveal({
  src,
  alt,
  sizes,
  className,
  imageClassName,
  priority = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}) {
  return (
    <motion.div
      className={`relative ${className ?? ""}`}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.2 }}
    >
      <motion.div
        data-reveal
        className="absolute inset-0 overflow-hidden"
        variants={{ hidden: { clipPath: "inset(100% 0% 0% 0%)" }, shown: { clipPath: "inset(0% 0% 0% 0%)" } }}
        transition={{ duration: 1.3, ease: EASE }}
      >
        <motion.div
          className="absolute inset-0"
          variants={{ hidden: { scale: 1.14 }, shown: { scale: 1 } }}
          transition={{ duration: 1.8, ease: EASE }}
        >
          <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${imageClassName ?? ""}`} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/** Full-bleed photograph that drifts slower than the page as you scroll. */
export function ParallaxImage({
  src,
  alt,
  sizes,
  className,
  priority = false,
  strength = 12,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${strength}%`, `${strength}%`]);
  return (
    <div ref={ref} className={`overflow-hidden ${className ?? "relative"}`}>
      <motion.div className="absolute -inset-y-[14%] inset-x-0" style={{ y }}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </motion.div>
    </div>
  );
}

/** Counts up to `value` the first time it scrolls into view. */
export function Counter({
  value,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [shown, setShown] = useState(value); // SSR + no-JS render the true figure
  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: EASE,
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value]);
  return (
    <span ref={ref} className={className}>
      {prefix}
      {shown.toLocaleString("en-GB")}
      {suffix}
    </span>
  );
}

export type ReelFrame = { src: string; alt: string; caption: string };

/**
 * Filmstrip that travels sideways while the page scrolls past it.
 *
 * Wide screens only, and never under reduced motion: there the section pins
 * and vertical scroll drives the strip. Everywhere else it is a plain
 * swipeable row, which is also the server render.
 */
export function ScrollReel({ frames }: { frames: ReelFrame[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setPinned(wide.matches && !reduced.matches);
      if (track.current) setShift(Math.max(0, track.current.scrollWidth - window.innerWidth));
    };
    apply();
    wide.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      wide.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -shift]);

  return (
    <div ref={ref} className={pinned ? "relative h-[240vh]" : "relative"}>
      <div className={pinned ? "sticky top-0 flex h-svh flex-col justify-center overflow-hidden" : "overflow-x-auto pb-4"}>
        <motion.div ref={track} style={pinned ? { x } : undefined} className="flex w-max gap-4 px-6 lg:gap-6">
          {frames.map((f, i) => (
            <figure key={f.src} className="shrink-0">
              <div className="relative aspect-[3/2] h-[38vh] overflow-hidden bg-night lg:h-[60vh]">
                <Image src={f.src} alt={f.alt} fill sizes="(min-width: 1024px) 60vw, 80vw" className="object-cover" />
              </div>
              <figcaption className="mt-3 flex gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-copy-muted">
                <span className="text-accent">{String(i + 1).padStart(2, "0")}</span>
                <span>{f.caption}</span>
              </figcaption>
            </figure>
          ))}
        </motion.div>
        {pinned && (
          <div className="mx-6 mt-8 h-px bg-hairline">
            <motion.div className="h-px origin-left bg-accent" style={{ scaleX: scrollYProgress }} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Hairline across the top of the viewport that fills as the page is read. */
export function ReadingRule() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-accent"
      style={{ scaleX: scrollYProgress }}
    />
  );
}
