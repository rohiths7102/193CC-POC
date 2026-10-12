"use client";

/**
 * The living background — fixed behind every section of the homepage.
 *
 * Four layers, all deliberately quiet:
 *  - Velvet: large, soft pools of chamber red and lacquer black drifting very
 *    slowly (40–90s cycles), so the ground reads as moving light on velvet
 *    rather than flat colour.
 *  - 193 gold motes, one per UN member state, drifting in from the edges and
 *    converging on a London point, then setting out again. They are nudged by
 *    the reader's scroll, deeper motes more than shallow ones.
 *  - The thread: a chamber-red line down the centre of the page with a gilt
 *    core, gently undulating, brightening with scroll speed, and a gold pulse
 *    that travels down it every few seconds — the signal between members and
 *    London.
 *  - Fine diagonal hatching (CSS) for texture.
 *
 * Canvas 2D at 30fps, paused while the tab is hidden; one static frame under
 * reduced motion. Mounted once in the root layout at -z-10, behind every
 * page's transparent grounds; hidden in print.
 */

import { useEffect, useRef } from "react";

const COUNT = 193;
const FOCUS = { x: 0.5, y: 0.44 };

type Mote = { x: number; y: number; z: number; phase: number; swirl: number };

// [rgb, alpha, radius as share of the longer side, x/y centre, x/y amplitude, period s]
const POOLS: [string, number, number, number, number, number, number, number][] = [
  ["176,36,44", 0.16, 0.55, 0.18, 0.22, 0.12, 0.10, 70],
  ["120,22,30", 0.18, 0.60, 0.82, 0.30, 0.10, 0.14, 90],
  ["176,36,44", 0.10, 0.45, 0.60, 0.80, 0.16, 0.08, 55],
  ["0,0,0", 0.35, 0.50, 0.35, 0.62, 0.12, 0.12, 80],
  ["0,0,0", 0.28, 0.42, 0.92, 0.88, 0.08, 0.10, 45],
  ["214,180,124", 0.035, 0.40, 0.45, 0.18, 0.14, 0.06, 65],
];

const spawn = (edge = true): Mote => {
  let x = Math.random(), y = Math.random();
  if (edge) {
    const side = Math.floor(Math.random() * 4);
    if (side === 0) y = -0.02; else if (side === 1) y = 1.02; else if (side === 2) x = -0.02; else x = 1.02;
  }
  return { x, y, z: 0.3 + Math.random() * 0.7, phase: Math.random() * Math.PI * 2, swirl: Math.random() < 0.5 ? -1 : 1 };
};

export function LivingBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css = getComputedStyle(document.documentElement);
    const GOLD = css.getPropertyValue("--raw-color-gold-200").trim() || "#f0d8a8";

    const motes: Mote[] = Array.from({ length: COUNT }, () => spawn(false));
    let W = 0, H = 0, raf = 0, last = 0, energy = 0, lastScroll = window.scrollY;
    const t0 = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const wave = (y: number, t: number) =>
      Math.sin(y * 0.0042 + t * 0.35) * 0.6 + Math.sin(y * 0.011 - t * 0.6) * 0.3 + Math.sin(y * 0.023 + t * 0.9) * 0.1;

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);

      // ── Velvet ──
      const L = Math.max(W, H);
      for (const [rgb, a, rad, cx0, cy0, ax, ay, period] of POOLS) {
        const ph = (t / period) * Math.PI * 2;
        const px = (cx0 + Math.sin(ph) * ax) * W, py = (cy0 + Math.cos(ph * 0.8) * ay) * H, r = rad * L;
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, `rgba(${rgb},${a})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      // ── The thread ──
      const amp = 10 + energy * 22;
      const cx = W / 2;
      const path = () => {
        ctx.beginPath();
        for (let y = -20; y <= H + 20; y += 16) {
          const x = cx + wave(y, t) * amp;
          if (y === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
      };
      ctx.lineCap = "round";
      path(); ctx.strokeStyle = `rgba(176,36,44,${0.10 + energy * 0.12})`; ctx.lineWidth = 26; ctx.stroke();
      path(); ctx.strokeStyle = `rgba(176,36,44,${0.22 + energy * 0.2})`; ctx.lineWidth = 6; ctx.stroke();
      path(); ctx.strokeStyle = `rgba(240,216,168,${0.28 + energy * 0.3})`; ctx.lineWidth = 1; ctx.stroke();

      // A gold pulse travelling down the thread every 4.5s.
      const py = ((t % 4.5) / 4.5) * (H + 300) - 150;
      for (let k = 0; k < 10; k++) {
        const y = py - k * 14;
        const x = cx + wave(y, t) * amp;
        ctx.fillStyle = `rgba(240,216,168,${(0.5 * (1 - k / 10)).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x, y, 2.2 - k * 0.15, 0, Math.PI * 2); ctx.fill();
      }

      // ── 193 motes converging on London ──
      const fx = FOCUS.x * W, fy = FOCUS.y * H;
      for (const m of motes) {
        const px = m.x * W, py2 = m.y * H;
        const d = Math.hypot(fx - px, fy - py2);
        const tw = 0.55 + 0.45 * Math.sin(t * 1.6 + m.phase);
        const near = Math.min(1, d / 160); // fade as they arrive
        ctx.globalAlpha = (0.12 + 0.45 * m.z) * tw * near;
        ctx.fillStyle = GOLD;
        ctx.beginPath(); ctx.arc(px, py2, 0.5 + 1.4 * m.z, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const step = (dt: number) => {
      const fx = FOCUS.x, fy = FOCUS.y;
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        const dx = fx - m.x, dy = fy - m.y, d = Math.hypot(dx, dy) || 1;
        const sp = 0.012 * m.z * dt;
        m.x += (dx / d) * sp + (-dy / d) * sp * 0.6 * m.swirl;
        m.y += (dy / d) * sp + (dx / d) * sp * 0.6 * m.swirl;
        if (d < 0.02) motes[i] = spawn(true);
      }
      energy *= Math.pow(0.04, dt); // decays within ~1s
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return; // ~30fps
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      step(dt);
      draw(now);
    };

    const onScroll = () => {
      const y = window.scrollY, delta = y - lastScroll;
      lastScroll = y;
      energy = Math.min(1, energy + Math.abs(delta) / 600);
      // Deeper motes drift further against the scroll.
      for (const m of motes) {
        m.y -= (delta / H) * 0.25 * m.z;
        if (m.y < -0.05) m.y += 1.1; else if (m.y > 1.05) m.y -= 1.1;
      }
      if (still) draw(performance.now());
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !still) raf = requestAnimationFrame(loop);
    };

    resize();
    draw(performance.now());
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    if (!still) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 print:hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(214,180,124,0.035)_0_1px,transparent_1px_14px)]" />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
