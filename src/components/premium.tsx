"use client";

/**
 * Premium motion foundations — the "$10k agency" layer.
 *
 * Everything here is a client component, transform/opacity-only (compositor
 * friendly), touch-aware and wired to prefers-reduced-motion. The shared
 * easing is expo-out [0.16, 1, 0.3, 1] — the current award-site standard:
 * fast arrival, long settle, zero bounce.
 */

import {
  createContext, useContext, useEffect, useRef, useState, useSyncExternalStore,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import { usePathname, useRouter } from "next/navigation";
import {
  motion, MotionConfig, useMotionValue, useSpring, useScroll,
  useTransform, useReducedMotion,
} from "framer-motion";

export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
/** Full-screen wipes/covers — sharp in, sharp out. */
export const EASE_WIPE: [number, number, number, number] = [0.87, 0, 0.13, 1];

/** True only on a mouse-driven viewport wide enough to warrant scroll-linked
 *  motion. Hydration-safe: false for SSR and first paint. */
function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
    const apply = () => setFine(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return fine;
}

/* ── Intro store — lets the hero choreograph AFTER the preloader curtain ──
      Module-level singleton so Preloader (on the page) and KineticTitle
      (deep in the tree) sync without threading context through server
      components. Pages without a Preloader are unaffected: only components
      that opt in via useIntroDone() wait on it. */
const introStore = {
  done: false,
  listeners: new Set<() => void>(),
  finish() {
    if (this.done) return;
    this.done = true;
    this.listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    introStore.listeners.add(l);
    return () => introStore.listeners.delete(l);
  },
};

/* Wall-clock ceiling on the intro gate, armed at module scope so it does NOT
   depend on <Preloader/> mounting. Everything above the fold (header, nav, h1,
   subhead, the only CTA) is gated on useIntroDone(), and the only thing that
   flipped that gate was a setTimeout inside Preloader's effect — so a slow or
   failed hydration left a blank navy screen indefinitely. Anchoring to
   performance.now() makes this a real ceiling rather than a delay measured from
   whenever the chunk happened to evaluate. finish() is idempotent, so the
   normal path (which fires earlier) still wins. */
if (typeof window !== "undefined") {
  setTimeout(() => introStore.finish(), Math.max(0, 2800 - performance.now()));
}

export function useIntroDone(): boolean {
  return useSyncExternalStore(
    (l) => introStore.subscribe(l),
    () => introStore.done,
    () => false
  );
}

/** Hydration-safe reduced-motion flag. framer's useReducedMotion() reads
 *  matchMedia during the FIRST client render, so branching markup on it
 *  mismatches the server HTML and torpedoes hydration for exactly the
 *  audience it serves. This one is always `false` for SSR + first paint and
 *  flips after mount — structural changes post-hydration are legal. */
function useReducedSafe(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/* ── Lenis smooth scroll — public pages only ──────────────────────────── */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  // Device tiering: ≤4 cores → flag the document so CSS can drop the
  // expensive layers (backdrop blur, ambient loops) while keeping the look.
  useEffect(() => {
    // Low-power tier: few cores, OR a coarse pointer (phone/tablet), OR the
    // browser reporting battery saver via reduced-motion. Any of these means
    // shed the GPU-expensive layers rather than drop frames.
    // Width-guarded: a large tablet (iPad Pro landscape, Surface) reports a
    // coarse pointer but has plenty of GPU, so it keeps the full treatment.
    const smallTouch = window.matchMedia(
      "(max-width: 1023px) and (hover: none), (max-width: 1023px) and (pointer: coarse)"
    ).matches;
    if ((navigator.hardwareConcurrency ?? 8) <= 4 || smallTouch) {
      document.documentElement.classList.add("low-power");
    }
  }, []);
  useEffect(() => {
    if (reduced) return;
    // Native touch scrolling is already smooth and hardware-accelerated;
    // running a JS scroll loop on top of it is a well-known source of mobile
    // jank and fights the browser's own fling physics. Desktop only.
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      anchors: true,
      autoRaf: true,
      // Nested scrollers (contract viewer on /sign) keep native wheel.
      allowNestedScroll: true,
    });
    return () => lenis.destroy();
  }, [reduced]);
  return <>{children}</>;
}

/* ── Preloader — brand-reveal curtain, once per session ───────────────────
      First visit: crest draws in, wordmark tracks out, gold line sweeps,
      counter runs 0→100, curtain lifts. Repeat visits: instant fast-exit.
      Always ends by flipping the intro store so the hero can begin. */
const INTRO_KEY = "cc193-intro-seen";

export function Preloader() {
  const reduced = useReducedMotion();
  // null = undecided (SSR renders the curtain to avoid a content flash)
  const [mode, setMode] = useState<"full" | "fast" | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(INTRO_KEY) === "1"; } catch { /* private mode */ }
    if (seen || reduced) {
      setMode("fast");
      setLeaving(true);
      introStore.finish();
      return;
    }
    setMode("full");
    try { sessionStorage.setItem(INTRO_KEY, "1"); } catch { /* ignore */ }

    // Counter: 0 → 100 over ~1.4s with an eased curve.
    const t0 = performance.now();
    const DUR = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / DUR);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const leave = setTimeout(() => setLeaving(true), 1750);
    const done = setTimeout(() => introStore.finish(), 2050);
    return () => { cancelAnimationFrame(raf); clearTimeout(leave); clearTimeout(done); };
  }, [reduced]);

  return (
    <motion.div
      data-cc-preloader
      className="preloader-failsafe fixed inset-0 z-[100] flex items-center justify-center bg-white"
      initial={false}
      animate={leaving ? { y: "-100%" } : { y: 0 }}
      transition={{ duration: mode === "fast" ? 0.45 : 0.9, ease: EASE }}
      style={{ willChange: "transform" }}
    >
      {/* If JS is disabled or the chunk never loads, the curtain must not
          entomb the server-rendered page: noscript kills it outright, and a
          pure-CSS failsafe (globals.css) fades it away after 5s regardless.
          The normal JS path unmounts it long before either fires. */}
      <noscript>
        <style>{`[data-cc-preloader]{display:none!important}.intro-gate{opacity:1!important;transform:none!important}`}</style>
      </noscript>
      {/* `mode` is null until the effect picks full-vs-fast, so the SSR curtain
          was an empty opaque rectangle. On a slow phone that is several seconds
          of featureless white; paint the brand mark so the wait is branded. */}
      {mode === null && (
        <div className="flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/193cc-logo.png" alt="" width={72} height={72} className="rounded-full" />
          <p className="mt-6 font-display text-xl tracking-wide text-ivory-50">
            193 Countries <span className="text-gold-grad italic">Consortium</span>
          </p>
          <div className="mt-5 h-px w-44 bg-gradient-to-r from-gold-500/0 via-gold-500 to-gold-500/0" />
        </div>
      )}
      {mode === "full" && (
            <div className="relative flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/193cc-logo.png" alt="" width={72} height={72} className="rounded-full" />
              </motion.div>
              <div className="mt-6 overflow-hidden">
                <motion.p
                  initial={{ y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
                  className="font-display text-xl tracking-wide text-ivory-50"
                >
                  193 Countries <span className="text-gold-grad italic">Consortium</span>
                </motion.p>
              </div>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.1, delay: 0.3, ease: EASE }}
                className="mt-5 h-px w-44 origin-left bg-gradient-to-r from-gold-500/0 via-gold-500 to-gold-500/0"
              />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-[10px] uppercase tracking-[0.5em] text-mist"
              >
                Membership · London
              </motion.p>
              <p className="pointer-events-none absolute -bottom-24 right-1/2 translate-x-1/2 font-display text-sm tabular-nums text-gold-500/70 sm:right-[-30vw] sm:translate-x-0 sm:text-base">
                {String(count).padStart(3, "0")}
              </p>
        </div>
      )}
    </motion.div>
  );
}

/** Mount this on the landing page: renders the curtain, removes it from the
 *  DOM entirely once its exit travel has finished. */
export function PreloaderGate() {
  const [gone, setGone] = useState(false);
  const done = useIntroDone();
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setGone(true), 1000); // curtain travel time
    return () => clearTimeout(t);
  }, [done]);
  if (gone) return null;
  return <Preloader />;
}

/* ── IntroReveal — like a scroll reveal, but choreographed to the preloader:
      nothing moves until the curtain lifts, then the hero assembles in
      sequence. Use ONLY on pages that mount <PreloaderGate/>. ─────────── */
export function IntroReveal({
  children, delay = 0, y = 26, className,
}: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const done = useIntroDone();
  // `intro-gate` is a pure-CSS failsafe for the case where JS never runs at all:
  // framer serialises `initial` into the SSR HTML, so without it a dead bundle
  // leaves the hero permanently at opacity 0. It is dropped the instant the gate
  // opens, so the animation never fires for working JS and its `forwards` fill
  // can't pin a transform on top of framer's inline styles.
  const cls = done ? className : className ? `intro-gate ${className}` : "intro-gate";
  return (
    <motion.div
      className={cls}
      initial={{ opacity: 0, y }}
      animate={done ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.85, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ── Custom cursor — trailing champagne ring (fine pointers only).
      The NATIVE cursor stays visible — hiding it breaks form ergonomics and
      accessibility; the lagged ring is the luxury signature, not a gimmick. */
export function CustomCursor() {
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [overInput, setOverInput] = useState(false);
  const [pressed, setPressed] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 400, damping: 40, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 400, damping: 40, mass: 0.5 });

  useEffect(() => {
    if (reduced) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;
    setEnabled(true);

    const move = (e: PointerEvent) => { x.set(e.clientX); y.set(e.clientY); };
    const over = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      setOverInput(Boolean(t?.closest("input, select, textarea, [data-cursor='hide']")));
      setHovering(Boolean(t?.closest("a, button, [role='button'], label, summary")));
    };
    const down = () => setPressed(true);
    const up = () => setPressed(false);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, [reduced, x, y]);

  if (!enabled) return null;
  return (
    <motion.div
      aria-hidden
      // The structural `line` token is far too faint to track against white —
      // the ring needs the brand hue to stay legible on a light ground.
      className="pointer-events-none fixed left-0 top-0 z-[119] rounded-full border border-gold-500/50"
      style={{ x: ringX, y: ringY, translateX: "-50%", translateY: "-50%" }}
      animate={{
        width: hovering ? 46 : 30,
        height: hovering ? 46 : 30,
        opacity: overInput ? 0 : pressed ? 0.4 : hovering ? 0.95 : 0.5,
        scale: pressed ? 0.82 : 1,
        backgroundColor: hovering ? "rgba(239,70,59,0.10)" : "rgba(239,70,59,0)",
      }}
      transition={{ duration: 0.25, ease: EASE }}
    />
  );
}

/* ── Scroll progress — hairline gold bar along the top. Hidden entirely on
      pages that don't scroll (login fits one screen; progress there would
      read "fully scrolled" — framer resolves 0/0 travel to 1). ──────────── */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });
  const [scrollable, setScrollable] = useState(false);
  useEffect(() => {
    const check = () =>
      setScrollable(document.documentElement.scrollHeight > window.innerHeight + 8);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(document.documentElement);
    window.addEventListener("resize", check);
    return () => { ro.disconnect(); window.removeEventListener("resize", check); };
  }, []);
  if (!scrollable) return null;
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[90] h-[2px] origin-left bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600"
      style={{ scaleX }}
    />
  );
}

/* ── Magnetic — element leans toward the pointer, springs back ─────────── */
export function Magnetic({
  children, strength = 0.32, className,
}: { children: ReactNode; strength?: number; className?: string }) {
  const reduced = useReducedSafe();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Damping high enough that the return settle has no visible wobble —
  // luxury motion is damped; springs are physics, not decoration.
  const sx = useSpring(x, { stiffness: 170, damping: 21, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 170, damping: 21, mass: 0.3 });

  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: sx, y: sy, display: "inline-block" }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

/* ── TextReveal — line-mask rise, the signature award-site text move ───── */
export function TextReveal({
  text, as: Tag = "span", className, delay = 0, once = true,
}: { text: string; as?: "span" | "p" | "h1" | "h2" | "h3"; className?: string; delay?: number; once?: boolean }) {
  const words = text.split(" ");
  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <motion.span
        aria-hidden
        initial="hidden"
        whileInView="show"
        viewport={{ once, margin: "-40px" }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: delay } } }}
        className="inline"
      >
        {words.map((w, i) => (
          <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <motion.span
              className="inline-block whitespace-pre will-change-transform"
              variants={{ hidden: { y: "115%" }, show: { y: 0, transition: { duration: 0.75, ease: EASE } } }}
            >
              {w}{i < words.length - 1 ? " " : ""}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}

/* ── ParallaxY — scroll-linked drift for decorative layers ─────────────── */
export function ParallaxY({
  children, from = 40, to = -40, className,
}: { children: ReactNode; from?: number; to?: number; className?: string }) {
  const reduced = useReducedSafe();
  const ref = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const yRange = useTransform(scrollYProgress, [0, 1], [from, to]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={reduced || !fine ? undefined : { y: yRange }}>{children}</motion.div>
    </div>
  );
}

/* ── Spotlight — pointer-tracked sheen for cards (CSS var driven) ──────── */
export function Spotlight({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={`spotlight ${className ?? ""}`}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = ref.current!.getBoundingClientRect();
        ref.current!.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
        ref.current!.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}

/* ── FadeOutOnScroll — hero exit choreography: as the visitor scrolls away,
      the hero dims. Opacity only (a translate here opened a gap between the
      hero and the next section), floored at 0.4 so on-screen content never
      reads as broken. ─────────────────────────────────────────────────── */
export function FadeOutOnScroll({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedSafe();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const fine = useFinePointer();
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.4]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={reduced || !fine ? undefined : { opacity }}>{children}</motion.div>
    </div>
  );
}

/* ── RouteFade — the current-wave page transition: outgoing content fades
      down 180ms, the new route fades in 350ms. No full-screen cover — the
      grand curtain is reserved for the first-entrance preloader, where the
      drama is earned. Delegated listener: plain left-clicks on same-origin,
      non-hash links only; everything else navigates natively. */
export function RouteFade({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const router = useRouter();
  const pathname = usePathname();
  const [out, setOut] = useState(false);
  const navTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Intercept qualifying link clicks. CAPTURE phase is load-bearing: React's
  // root delegate runs <Link>'s own preventDefault+push during bubble, so a
  // bubble-phase listener here would always see defaultPrevented and never
  // fire. In capture we preventDefault FIRST; Next's Link handler checks
  // event.defaultPrevented and stands down, leaving navigation to our timer.
  useEffect(() => {
    if (reduced) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return; // internal only
      if (href.split("#")[0] === window.location.pathname) return; // same page / hash scroll
      e.preventDefault();
      setOut(true);
      clearTimeout(navTimer.current);
      navTimer.current = setTimeout(() => router.push(href), 190);
    };
    document.addEventListener("click", onClick, true);
    return () => { document.removeEventListener("click", onClick, true); clearTimeout(navTimer.current); };
  }, [reduced, router]);

  // Fade the new route in once it has rendered.
  useEffect(() => { setOut(false); }, [pathname]);

  // Failsafe: a push that stalls or resolves to the same pathname must never
  // leave the page invisible.
  useEffect(() => {
    if (!out) return;
    const t = setTimeout(() => setOut(false), 1800);
    return () => clearTimeout(t);
  }, [out]);

  return (
    <motion.div
      animate={{ opacity: out ? 0 : 1, y: out ? 8 : 0 }}
      transition={out
        ? { duration: 0.18, ease: "easeIn" }
        : { duration: 0.35, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ── Public shell — one wrapper the (public) layout mounts ─────────────── */
const ShellCtx = createContext(false);
export function PremiumShell({ children }: { children: ReactNode }) {
  return (
    <ShellCtx.Provider value={true}>
      <MotionConfig reducedMotion="user">
        <SmoothScroll>
          <CustomCursor />
          <ScrollProgress />
          <RouteFade>{children}</RouteFade>
        </SmoothScroll>
      </MotionConfig>
    </ShellCtx.Provider>
  );
}
export const useInPremiumShell = () => useContext(ShellCtx);
