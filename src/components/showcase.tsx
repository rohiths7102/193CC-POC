"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useIntroDone, EASE } from "@/components/premium";

/* ── Living constellation — the organisation's network-globe motif, animated.
      Brand gradient nodes drift and link; pointer adds gentle parallax. ── */
export function NetworkCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Never mount the element at all on devices that will not paint it —
  // a CSS-hidden full-viewport <canvas> still costs a compositor layer.
  const [on, setOn] = useState(false);

  // Pass 1: decide. Touch/low-core devices skip the constellation entirely —
  // an animated canvas is pure overhead on a phone, and on a throttled device
  // it steals frames from scrolling.
  useEffect(() => {
    if (
      (navigator.hardwareConcurrency ?? 8) <= 4 ||
      window.matchMedia("(hover: none), (pointer: coarse)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;
    setOn(true);
  }, []);

  // Pass 2: only now does the element exist, so the ref is safe.
  useEffect(() => {
    if (!on) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const COLORS = ["#BA60A4", "#9878B6", "#0F9BD7"];
    let W = 0, H = 0;
    const mouse = { x: 0.5, y: 0.5 };

    const nodes = Array.from({ length: 46 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0006, vy: (Math.random() - 0.5) * 0.0006,
      r: 1.2 + Math.random() * 2.2, c: COLORS[Math.floor(Math.random() * 3)],
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) / rect.width;
      mouse.y = (e.clientY - rect.top) / rect.height;
    };
    window.addEventListener("pointermove", onMove);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const frame = () => {
      ctx.clearRect(0, 0, W, H);
      const px = (mouse.x - 0.5) * 14, py = (mouse.y - 0.5) * 14;

      for (const n of nodes) {
        if (!reduced) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > 1) n.vx *= -1;
          if (n.y < 0 || n.y > 1) n.vy *= -1;
        }
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = (a.x - b.x) * W, dy = (a.y - b.y) * H;
          const d = Math.hypot(dx, dy);
          if (d < 130) {
            ctx.strokeStyle = `rgba(152, 120, 182, ${(1 - d / 130) * 0.35})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x * W + px, a.y * H + py);
            ctx.lineTo(b.x * W + px, b.y * H + py);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = n.c;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(n.x * W + px, n.y * H + py, n.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("pointermove", onMove); };
  }, [on]);

  if (!on) return null;
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

/* ── Liquid light ribbons — full-page flowing streaks (gold/azure/violet),
      time-animated AND scroll-driven: scrolling pulls the streams so the
      motion continues down the page. Additive blending = luminous chrome. ── */
export function LiquidRibbons({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [on, setOn] = useState(false);

  // Pass 1: decide. Low-power / touch / reduced-motion devices skip the canvas
  // entirely — the aurora field carries the ambience alone.
  useEffect(() => {
    if (
      (navigator.hardwareConcurrency ?? 8) <= 4 ||
      window.matchMedia("(hover: none), (pointer: coarse)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;
    setOn(true);
  }, []);

  // Pass 2: the element now exists, so the ref is safe.
  useEffect(() => {
    if (!on) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    // DPR 1: this is a soft out-of-focus glow — extra pixels are pure waste.
    const DPR = 1;
    let W = 0, H = 0, raf = 0, t = 0, tick = 0;
    let scrollTarget = 0, scroll = 0, mouseY = 0.5;

    const RIBBONS = [
      { y: 0.24, amp: 0.10, freq: 0.0016, speed: 0.012, drift: 0.00045, w: 90,
        stops: ["rgba(232,207,154,0)", "rgba(198,161,91,0.55)", "rgba(232,207,154,0.9)", "rgba(131,101,47,0)"] },
      { y: 0.58, amp: 0.14, freq: 0.0012, speed: -0.009, drift: 0.00075, w: 120,
        stops: ["rgba(15,155,215,0)", "rgba(15,155,215,0.6)", "rgba(152,120,182,0.8)", "rgba(15,155,215,0)"] },
      { y: 0.82, amp: 0.08, freq: 0.0020, speed: 0.007, drift: 0.0006, w: 70,
        stops: ["rgba(186,96,164,0)", "rgba(186,96,164,0.45)", "rgba(152,120,182,0.6)", "rgba(186,96,164,0)"] },
    ];

    const resize = () => {
      // Size the bitmap from the element's actual box, not the window — on
      // mobile the URL-bar show/hide makes innerHeight disagree with 100vh
      // and the drawing stretches. Matches NetworkCanvas.
      const rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener("resize", resize);
    const onScroll = () => { scrollTarget = window.scrollY; };
    const onMove = (e: PointerEvent) => { mouseY = e.clientY / H; };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const frame = () => {
      // Ambience runs at 30fps — imperceptible for a soft background drift,
      // halves the paint cost AND how often glass backdrops must re-blur.
      tick++;
      if (tick % 2 === 0) { raf = requestAnimationFrame(frame); return; }

      t += 2;
      scroll += (scrollTarget - scroll) * 0.1; // buttery lag — streaks chase the scroll
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      for (const r of RIBBONS) {
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        r.stops.forEach((c, i) => grad.addColorStop(i / (r.stops.length - 1), c));
        const phase = t * r.speed + scroll * r.drift * 6;
        const baseY = r.y * H + (mouseY - 0.5) * 26 - (scroll * r.drift * 40) % H * 0.08;

        // Fewer, wider strands + NO shadowBlur (a per-stroke gaussian blur
        // every frame was the single biggest cost on the page). The soft
        // glow now comes from one wide low-alpha under-stroke — near-free.
        for (let s = 0; s < 7; s++) {
          const off = (s - 3) * (r.w / 7);
          const centre = s === 3;
          const alpha = 0.085 * (1 - Math.abs(s - 3) / 4);
          ctx.strokeStyle = grad;
          ctx.globalAlpha = reduced ? alpha * 0.7 : alpha;
          ctx.lineWidth = centre ? 3 : 2;
          ctx.beginPath();
          for (let x = -40; x <= W + 40; x += 14) {
            const y = baseY + off
              + Math.sin(x * r.freq + phase + s * 0.16) * r.amp * H
              + Math.sin(x * r.freq * 2.7 - phase * 1.6) * r.amp * H * 0.3;
            x === -40 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
          if (centre) {
            // glow pass: same path, wide + faint
            ctx.globalAlpha = (reduced ? 0.7 : 1) * 0.05;
            ctx.lineWidth = 14;
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
    };
  }, [on]);

  if (!on) return null;
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

/* ── Live countdown to the Summit ── */
export function Countdown({ target, label }: { target: string; label: string }) {
  // null until mounted — SSR and client would otherwise render different
  // seconds and trip a hydration mismatch.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    let id: ReturnType<typeof setInterval> | undefined;
    // Only tick while the tab is actually visible — a background tab was
    // paying for a re-render every second for nothing.
    const start = () => { if (!id) id = setInterval(() => setNow(Date.now()), 1000); };
    const stop = () => { if (id) { clearInterval(id); id = undefined; } };
    const onVis = () => (document.hidden ? stop() : (setNow(Date.now()), start()));
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  const diff = now === null ? 0 : Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000) % 24;
  const m = Math.floor(diff / 60000) % 60;
  const s = Math.floor(diff / 1000) % 60;
  const cells: [string, number][] = [["Days", d], ["Hours", h], ["Min", m], ["Sec", s]];
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-mist">{label}</p>
      {/* wraps + narrower floor so four cells never overflow a 375px screen */}
      <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:gap-3">
        {cells.map(([unit, v]) => (
          <div key={unit} className="glass-strong min-w-[64px] rounded-2xl px-3 py-3 text-center sm:min-w-[76px] sm:px-4">
            <motion.p key={v} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="font-display text-3xl text-ivory-50 tabular-nums">
              {String(v).padStart(2, "0")}
            </motion.p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-gold-400">{unit}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Kinetic headline — line-mask word reveal, choreographed to begin the
      moment the preloader curtain lifts (intro store). ── */
export function KineticTitle({ words, className }: { words: { text: string; gold?: boolean; italic?: boolean }[]; className?: string }) {
  const introDone = useIntroDone();
  return (
    <h1 className={className}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.1em] -mb-[0.1em] align-bottom">
          <motion.span
            className={`inline-block whitespace-pre ${w.gold ? "text-gold-grad" : ""} ${w.italic ? "italic" : ""}`}
            initial={{ y: "118%" }}
            animate={introDone ? { y: 0 } : { y: "118%" }}
            transition={{ delay: 0.06 + i * 0.055, duration: 0.85, ease: EASE }}
          >
            {w.text}{" "}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

/* ── 3D tilt card — pointer-tracked perspective ── */
export function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ rx: 0, ry: 0 });
  return (
    <div
      ref={ref}
      className={className}
      style={{ perspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = ref.current!.getBoundingClientRect();
        setT({
          ry: ((e.clientX - r.left) / r.width - 0.5) * 10,
          rx: -((e.clientY - r.top) / r.height - 0.5) * 10,
        });
      }}
      onPointerLeave={() => setT({ rx: 0, ry: 0 })}
    >
      <motion.div
        animate={{ rotateX: t.rx, rotateY: t.ry }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        style={{ transformStyle: "preserve-3d" }}
        className="h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ── Event film block — plays real footage when the client supplies it.
      Desktop only: a looping autoplay video behind 20+ glass surfaces is the
      single largest battery/GPU cost on a phone, and on a throttled device it
      competes with the compositor for the frame budget. Small/touch screens
      get the graded still instead, which is indistinguishable at that size.
      Mount-gated (not CSS-hidden) so the bytes are never even fetched. ── */
export function EventFilm({ src, poster, className }: { src?: string; poster?: string; className?: string }) {
  const [playFilm, setPlayFilm] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Honour the OS/browser data-saver signal too.
    const saveData = Boolean((navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData);
    const apply = () => setPlayFilm(mq.matches && !reduced && !saveData);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (!src) return null;
  if (!playFilm) {
    // Static stand-in: the poster if the client has supplied one, otherwise a
    // brand gradient that matches the film's tonal grade.
    return (
      <div
        aria-hidden="true"
        className={className ?? "h-full w-full rounded-3xl"}
        style={
          poster
            ? { backgroundImage: `url(${poster})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { backgroundImage: "radial-gradient(120% 90% at 70% 10%, #132244 0%, #0A1428 45%, #060B16 100%)" }
        }
      />
    );
  }
  return (
    <video
      className={className ?? "h-full w-full rounded-3xl object-cover"}
      src={src} poster={poster}
      autoPlay muted loop playsInline
      preload="metadata"
      aria-hidden="true"
      // Browser extensions (e.g. WebBoost) inject attributes into <video>
      // before React hydrates — harmless, so don't fail hydration over it.
      suppressHydrationWarning
    />
  );
}
