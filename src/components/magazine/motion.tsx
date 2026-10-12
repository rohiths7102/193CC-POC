"use client";

/**
 * Editorial motion primitives (framer-motion — ADR-0028).
 *
 * Every primitive marks its node `data-reveal` so the <noscript> rule in
 * `MagazineMotion` can show it when JavaScript is off; reduced motion is
 * handled once by `MotionConfig reducedMotion="user"`, which drops the
 * transforms and keeps the fades — no server/client markup branch.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  MotionConfig,
  animate,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "framer-motion";
import { useIntroDone } from "@/components/premium";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Scroll-linked styles bypass MotionConfig, so these check the preference
 *  themselves. False for SSR and first paint (no hydration mismatch). */
function useStill(): boolean {
  const [still, setStill] = useState(false);
  useEffect(() => setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return still;
}

export function MagazineMotion({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <noscript>
        <style>{`[data-reveal]{opacity:1!important;transform:none!important;clip-path:none!important;filter:none!important}`}</style>
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
      initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
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
  afterIntro = false,
}: {
  lines: ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  as?: "h1" | "h2" | "p";
  /** Hold until the opening doors have parted (pages with PreloaderGate). */
  afterIntro?: boolean;
}) {
  const Tag = motion[as];
  const introDone = useIntroDone();
  const trigger = afterIntro
    ? { animate: introDone ? "shown" : "hidden" }
    : { whileInView: "shown", viewport: { once: true, amount: 0.4 } };
  return (
    <Tag
      className={className}
      initial="hidden"
      {...trigger}
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
      data-cursor="view"
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
        {/* Gilt hairline, set in from the edge like a mount, drawn after the wipe. */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-3 border border-gilt/60"
          variants={{ hidden: { opacity: 0, scale: 1.03 }, shown: { opacity: 1, scale: 1 } }}
          transition={{ duration: 1.2, delay: 0.8, ease: EASE }}
        />
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
  zoom = 0,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  strength?: number;
  /** Extra scale reached as the image scrolls out (0.2 = 120%). */
  zoom?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${strength}%`, `${strength}%`]);
  const scale = useTransform(scrollYProgress, [0.5, 1], [1, 1 + zoom]);
  return (
    <div ref={ref} className={`overflow-hidden ${className ?? "relative"}`}>
      <motion.div className="absolute -inset-y-[14%] inset-x-0" style={{ y, scale }}>
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

/**
 * A pool of chamber-red light behind a section that drifts against the
 * scroll and swells as the section crosses the middle of the screen. Sits at
 * -z-10, so its section needs `relative isolate`.
 */
export function ChamberLight({ at = "right" }: { at?: "left" | "right" }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-18%", "18%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.15, 0.55, 0.15]);
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        style={{ y, opacity }}
        className={
          at === "right"
            ? "absolute inset-0 bg-[radial-gradient(55%_45%_at_78%_35%,var(--chamber)_0%,transparent_70%)]"
            : "absolute inset-0 bg-[radial-gradient(55%_45%_at_18%_55%,var(--chamber)_0%,transparent_70%)]"
        }
      />
    </div>
  );
}

/**
 * A section that opens as an iris: a circle of the section grows from the
 * centre as it scrolls up into view, until it fills the screen. Scroll-linked,
 * so it opens exactly as fast as the reader scrolls.
 */
export function IrisReveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.15"] });
  const r = useTransform(scrollYProgress, [0, 1], [8, 150]);
  const clipPath = useTransform(r, (v) => `circle(${v}% at 50% 40%)`);
  const still = useStill();
  return (
    <motion.div ref={ref} className={className} style={{ clipPath: still ? "none" : clipPath }}>
      {children}
    </motion.div>
  );
}

function ScrollWord({ word, progress, range, still }: { word: string; progress: MotionValue<number>; range: [number, number]; still: boolean }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <motion.span style={{ opacity: still ? 1 : opacity }} className="inline-block whitespace-pre">
      {word}{" "}
    </motion.span>
  );
}

/** Text that lights up word by word as it is scrolled through. */
export function ScrollWords({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(" ");
  const still = useStill();
  return (
    <p ref={ref} className={className} aria-label={text}>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <ScrollWord key={i} word={w} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} still={still} />
        ))}
      </span>
    </p>
  );
}

/**
 * Giant outlined type that drifts sideways forever and surges with scroll
 * velocity — scroll faster and it runs faster (and reverses when you scroll
 * back up). Reduced motion: it stays still.
 */
export function VelocityMarquee({ text, className }: { text: string; className?: string }) {
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 300 });
  const boost = useTransform(velocity, [-2000, 0, 2000], [-6, 0, 6], { clamp: false });
  const dir = useRef(1);
  const still = useStill();
  useAnimationFrame((_, delta) => {
    if (still) return;
    const b = boost.get();
    if (b < 0) dir.current = -1;
    else if (b > 0) dir.current = 1;
    let next = x.get() - dir.current * (delta / 1000) * 3 * (1 + Math.abs(b));
    // The text is repeated four times; wrap after one copy (25%).
    if (next <= -25) next += 25;
    if (next > 0) next -= 25;
    x.set(next);
  });
  const xPct = useTransform(x, (v) => `${v}%`);
  return (
    <div className={`overflow-hidden whitespace-nowrap ${className ?? ""}`} aria-hidden="true">
      <motion.div style={{ x: xPct }} className="flex w-max">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="text-outline-lords pr-[0.4em] font-headline text-[clamp(4.5rem,13vw,12rem)] leading-[1.05]">
            {text}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·";

/**
 * Text that decodes into place the first time it is seen: characters cycle
 * through random glyphs and settle left to right. The server renders the
 * final text, so no-JS readers and crawlers get it as written.
 */
export function Scramble({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.8 });
  const [out, setOut] = useState(text);
  useEffect(() => {
    if (!inView || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t0 = performance.now(), dur = 700 + text.length * 18;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const settled = Math.floor(p * text.length);
      setOut(
        text
          .split("")
          .map((ch, i) => (i < settled || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(""),
      );
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, text]);
  return (
    <span ref={ref} className={className} aria-label={text}>
      <span aria-hidden="true">{out}</span>
    </span>
  );
}

/**
 * A photograph that changes in place with a pixel dissolve: chamber-red
 * squares close over the frame in a random order, the next image is set
 * behind them, and they open again. Cycles only while on screen; a static
 * first image under reduced motion.
 */
export function PixelSwap({
  images,
  sizes,
  className,
  every = 4200,
}: {
  images: { src: string; alt: string }[];
  sizes: string;
  className?: string;
  every?: number;
}) {
  const COLS = 14, ROWS = 8;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const [i, setI] = useState(0);
  const [covered, setCovered] = useState(false);
  const delays = useMemo(() => Array.from({ length: COLS * ROWS }, (_, k) => ((k * 7919) % 97) / 97), []);

  useEffect(() => {
    if (!inView || images.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let swap: ReturnType<typeof setTimeout>, open: ReturnType<typeof setTimeout>;
    const cycle = setInterval(() => {
      setCovered(true);
      swap = setTimeout(() => setI((x) => (x + 1) % images.length), 520);
      open = setTimeout(() => setCovered(false), 620);
    }, every);
    return () => { clearInterval(cycle); clearTimeout(swap); clearTimeout(open); };
  }, [inView, images.length, every]);

  return (
    <div ref={ref} data-cursor="view" className={`relative overflow-hidden bg-night ${className ?? ""}`}>
      <Image src={images[i].src} alt={images[i].alt} fill sizes={sizes} className="object-cover" />
      <div aria-hidden="true" className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}>
        {delays.map((d, k) => (
          <motion.span
            key={k}
            className="bg-chamber-deep"
            initial={false}
            animate={{ opacity: covered ? 1 : 0 }}
            transition={{ duration: 0.12, delay: d * 0.38 }}
          />
        ))}
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute inset-3 border border-gilt/60" />
    </div>
  );
}

/**
 * Giant stacked words; the one the reader has reached fills with gold, the
 * others stay as gilt outlines.
 */
export function WordStack({ words, className }: { words: string[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.75", "end 0.35"] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (p) => setActive(Math.min(words.length - 1, Math.max(0, Math.floor(p * words.length)))));
  return (
    <div ref={ref} className={className}>
      {words.map((w, k) => (
        <p
          key={w}
          className={`font-headline text-[clamp(3.5rem,11vw,10rem)] uppercase leading-[0.92] tracking-[-0.01em] transition-colors duration-700 ${
            k === active ? "text-gilt" : "text-outline-lords"
          } ${k % 2 === 1 ? "pl-[12%]" : ""}`}
        >
          {w}
        </p>
      ))}
    </div>
  );
}

export type GalleryItem = {
  src: string;
  alt: string;
  title: string;
  line: string;
  /** Desktop placement inside the collage, in % of its box. */
  left: number;
  top: number;
  width: number;
  /** Parallax depth: higher drifts further against the scroll. */
  depth: number;
};

function FloatingPhoto({ item, progress, still }: { item: GalleryItem; progress: MotionValue<number>; still: boolean }) {
  const y = useTransform(progress, [0, 1], [item.depth * 140, -item.depth * 140]);
  return (
    <motion.figure
      className="absolute"
      style={{ left: `${item.left}%`, top: `${item.top}%`, width: `${item.width}%`, y: still ? 0 : y }}
    >
      <ImageReveal src={item.src} alt={item.alt} sizes="30vw" className="aspect-[4/3] w-full" />
      <figcaption className="mt-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-copy">{item.title}</p>
        <p className="mt-1.5 max-w-64 font-headline text-[15px] italic leading-snug text-copy-muted">{item.line}</p>
      </figcaption>
    </motion.figure>
  );
}

/**
 * Photographs scattered at different sizes, drifting at different speeds as
 * the page scrolls — the floating-collage move. Phones get a plain two-up
 * grid instead; the collage only exists where there is room for it.
 */
export function FloatingGallery({ items }: { items: GalleryItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const still = useStill();
  return (
    <>
      <div ref={ref} className="relative mx-auto hidden h-[1080px] max-w-7xl px-6 lg:block">
        <div className="relative h-full">
          {items.map((it) => (
            <FloatingPhoto key={it.src} item={it} progress={scrollYProgress} still={still} />
          ))}
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-10 px-6 lg:hidden">
        {items.map((it) => (
          <figure key={it.src}>
            <ImageReveal src={it.src} alt={it.alt} sizes="50vw" className="aspect-[4/3] w-full" />
            <figcaption className="mt-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-copy">{it.title}</p>
              <p className="mt-1 font-headline text-sm italic leading-snug text-copy-muted">{it.line}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}
