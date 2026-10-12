"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useIntroDone, EASE } from "@/components/premium";

/* ── Ambient field — the whole-page atmospheric ground. ─────────────────────
      This is the reference site's WebGL ShaderMaterial (noise-driven ambient
      motion under a fixed full-viewport canvas), rebuilt WITHOUT Three.js.
      The shader was ~40 lines of domain-warped noise sampled per pixel; that
      same field is computed here on a 64×36 grid and upscaled by the browser's
      bilinear filter, which for a field this smooth is visually identical and
      costs about a thousandth of a fragment shader — no 600KB dependency, no
      WebGL context, no GPU memory pinned for the life of the page.

      Palette is the LSI trio at very low alpha, composited with `multiply`
      over the white ground so it deepens toward each hue instead of washing.
      Pointer offsets the sample origin (parallax); scroll drifts it (the
      field travels with the page). 30fps cap; skipped entirely on low-power,
      touch and reduced-motion — the still white ground is the correct
      fallback, not a frozen frame of noise. ── */
export function AmbientField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (
      (navigator.hardwareConcurrency ?? 8) <= 4 ||
      window.matchMedia("(hover: none), (pointer: coarse)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;
    setOn(true);
  }, []);

  useEffect(() => {
    if (!on) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    // The field is computed at this resolution and let the browser upscale.
    // 64×36 keeps a 16:9 aspect; the browser's bilinear filter does the rest.
    const GW = 64, GH = 36;
    const off = document.createElement("canvas");
    off.width = GW; off.height = GH;
    const octx = off.getContext("2d")!;
    const img = octx.createImageData(GW, GH);
    const px = img.data;

    // ── Value noise with a tiny permutation table — the shader's hash() ──
    const P = new Uint8Array(512);
    const perm = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [perm[i], perm[j]] = [perm[j], perm[i]]; }
    for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
    const fade = (t: number) => t * t * (3 - 2 * t);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const grad = (h: number, x: number, y: number) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
    const noise = (x: number, y: number) => {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      x -= Math.floor(x); y -= Math.floor(y);
      const u = fade(x), v = fade(y);
      const a = P[X] + Y, b = P[X + 1] + Y;
      return lerp(
        lerp(grad(P[a], x, y), grad(P[b], x - 1, y), u),
        lerp(grad(P[a + 1], x, y - 1), grad(P[b + 1], x - 1, y - 1), u),
        v,
      ) * 0.5 + 0.5;
    };
    // fbm + one round of domain warp — the "sophisticated" part of the shader
    const fbm = (x: number, y: number) => {
      let v = 0, a = 0.5, f = 1;
      for (let i = 0; i < 4; i++) { v += a * noise(x * f, y * f); f *= 2.02; a *= 0.5; }
      return v;
    };

    // Palette as premultiplied "ink" amounts — how much of each hue to pull the
    // white ground toward. red / navy / amber, in that order of dominance.
    const RED = [239, 70, 59], NAVY = [49, 60, 89], AMB = [255, 174, 41];

    let W = 0, H = 0, raf = 0, t = 0, tick = 0;
    let mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5, scroll = 0, tscroll = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W; canvas.height = H; // DPR 1 — this is a blur, not type
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const onMove = (e: PointerEvent) => { tmx = e.clientX / W; tmy = e.clientY / H; };
    const onScroll = () => { tscroll = window.scrollY; };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    const frame = () => {
      tick++;
      if (tick % 2 === 0) { raf = requestAnimationFrame(frame); return; } // 30fps
      t += 0.0035;
      mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
      scroll += (tscroll - scroll) * 0.06;
      const ox = (mx - 0.5) * 0.6, oy = (my - 0.5) * 0.6 + scroll * 0.00035;

      let i = 0;
      for (let y = 0; y < GH; y++) {
        for (let x = 0; x < GW; x++) {
          // Larger scale (2.2 × 1.3 cycles across the viewport) so the lobes
          // are weather, not speckle.
          const nx = x / GW * 2.2 + ox, ny = y / GH * 1.3 + oy;
          // domain warp: sample the field through itself
          const wx = fbm(nx + t, ny - t * 0.6);
          const wy = fbm(nx - t * 0.7 + 5.2, ny + t + 1.3);
          const f = fbm(nx + wx * 1.6, ny + wy * 1.6);
          const g = fbm(nx * 0.7 - wy + 9.1, ny * 0.7 + wx - 4.4);
          // three soft lobes: red where f is high, navy where g is high, a
          // faint amber where both are mid. Alphas are the whole design —
          // the first pass at ~5% peak was invisible on white; these land
          // ~18% at the heart of a lobe, felt through /70 bands as ~8%.
          const ar = Math.max(0, f - 0.47) * 0.85;
          const an = Math.max(0, g - 0.45) * 1.15;
          const aa = Math.max(0, 0.16 - Math.abs(f - g)) * 0.55;
          // composite the three inks over white in linear-ish space
          let r = 255, gg = 255, b = 255;
          r = r * (1 - ar) + RED[0] * ar;  gg = gg * (1 - ar) + RED[1] * ar;  b = b * (1 - ar) + RED[2] * ar;
          r = r * (1 - an) + NAVY[0] * an; gg = gg * (1 - an) + NAVY[1] * an; b = b * (1 - an) + NAVY[2] * an;
          r = r * (1 - aa) + AMB[0] * aa;  gg = gg * (1 - aa) + AMB[1] * aa;  b = b * (1 - aa) + AMB[2] * aa;
          px[i++] = r; px[i++] = gg; px[i++] = b; px[i++] = 255;
        }
      }
      octx.putImageData(img, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "multiply";
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(off, 0, 0, W, H);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, [on]);

  if (!on) return null;
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

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
    // LSI palette: brand red, navy, and the muted slate that carries its body
    // copy — the old violet/azure trio was tuned for a near-black canvas.
    const COLORS = ["#EF463B", "#313C59", "#7B8397"];
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
            ctx.strokeStyle = `rgba(68, 79, 108, ${(1 - d / 130) * 0.3})`;
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

    // Repainted for the light ground in the LSI palette (red / navy / amber).
    // On white these are drawn with `multiply`, not `lighter` — see the frame
    // loop below for why the blend mode had to change with the background.
    const RIBBONS = [
      { y: 0.24, amp: 0.10, freq: 0.0016, speed: 0.012, drift: 0.00045, w: 90,
        stops: ["rgba(239,70,59,0)", "rgba(239,70,59,0.55)", "rgba(194,38,38,0.9)", "rgba(239,70,59,0)"] },
      { y: 0.58, amp: 0.14, freq: 0.0012, speed: -0.009, drift: 0.00075, w: 120,
        stops: ["rgba(49,60,89,0)", "rgba(49,60,89,0.6)", "rgba(68,79,108,0.8)", "rgba(49,60,89,0)"] },
      { y: 0.82, amp: 0.08, freq: 0.0020, speed: 0.007, drift: 0.0006, w: 70,
        stops: ["rgba(255,174,41,0)", "rgba(255,174,41,0.45)", "rgba(224,148,21,0.6)", "rgba(255,174,41,0)"] },
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
      // `lighter` (additive) only produces light ON a dark ground — over white
      // it saturates to white and the ribbons vanish entirely, burning a full
      // canvas repaint per frame to draw nothing. `multiply` is the light-ground
      // equivalent: it darkens toward each ribbon's hue instead.
      ctx.globalCompositeOperation = "multiply";

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
            {/* gold-500, not 400: at 10px this label needs the AA-passing red */}
            <p className="mt-1 text-[10px] uppercase tracking-widest text-gold-500">{unit}</p>
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
        <span key={i} className="inline-block overflow-hidden pb-[0.1em] mb-[-0.1em] align-bottom">
          <motion.span
            // `intro-gate` only while the gate is shut: framer serialises the
            // 118% offset into the SSR HTML inside an overflow-hidden mask, so a
            // bundle that never runs would hide the h1 permanently.
            className={`inline-block whitespace-pre ${introDone ? "" : "intro-gate "}${w.gold ? "text-gold-grad" : ""} ${w.italic ? "italic" : ""}`}
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
