"use client";

/**
 * The Reach globe — the 193 UN member states the consortium is open to.
 *
 * Continents are a gold dot-matrix (Natural Earth, pre-baked into
 * lib/globe-data.ts). When the globe first comes into view the countries
 * ignite one by one, sweeping outward from London, while the counter beside
 * it runs to 193 and arcs reach out from the London hub. Drag to turn it;
 * hover a pin for its name; search for a country and the globe turns to it.
 *
 * Reduced motion: everything is lit at once, no auto-rotation, and turning to
 * a searched country is instant. The loop pauses whenever the globe is off
 * screen.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { LAND_DOTS, UN_MEMBER_STATES } from "@/lib/globe-data";

type V3 = [number, number, number];
const DEG = Math.PI / 180;
const LONDON = { lat: 51.51, lon: -0.13 };

const toV = (lat: number, lon: number): V3 => [
  Math.cos(lat * DEG) * Math.sin(lon * DEG),
  Math.sin(lat * DEG),
  Math.cos(lat * DEG) * Math.cos(lon * DEG),
];

// Rotate by yaw (about Y) then pitch (about X); z > 0 faces the viewer.
const rotate = ([x, y, z]: V3, yaw: number, pitch: number): V3 => {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
};

const slerp = (a: V3, b: V3, t: number): V3 => {
  const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const om = Math.acos(d);
  if (om < 1e-4) return a;
  const s = Math.sin(om), wa = Math.sin((1 - t) * om) / s, wb = Math.sin(t * om) / s;
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
};

// Shortest signed angle from a to b.
const angDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

type State = { name: string; v: V3; lat: number; lon: number; order: number };

export function CountryGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lit, setLit] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const selectRef = useRef<(name: string) => void>(() => {});

  // Ignition order: nearest to London first.
  const states = useMemo<State[]>(() => {
    const L = toV(LONDON.lat, LONDON.lon);
    return UN_MEMBER_STATES.map(([name, lat, lon]) => ({ name, lat, lon, v: toV(lat, lon), order: 0 }))
      .map((s) => ({ ...s, d: Math.acos(Math.min(1, s.v[0] * L[0] + s.v[1] * L[1] + s.v[2] * L[2])) }))
      .sort((a, b) => a.d - b.d)
      .map((s, i) => ({ name: s.name, lat: s.lat, lon: s.lon, v: s.v, order: i }));
  }, []);

  const land = useMemo(() => {
    const out: V3[] = [];
    for (let i = 0; i < LAND_DOTS.length; i += 2) out.push(toV(LAND_DOTS[i] / 10, LAND_DOTS[i + 1] / 10));
    return out;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css = getComputedStyle(document.documentElement);
    const tok = (n: string, f: string) => css.getPropertyValue(n).trim() || f;
    const GOLD_HI = tok("--raw-color-gold-200", "#f0d8a8");
    const GOLD = tok("--raw-color-gold-400", "#d6b47c");
    const RED = tok("--raw-color-chamber-500", "#b0242c");
    const font = getComputedStyle(document.body).fontFamily;

    // Start facing London, tilted so Europe/Africa/Asia read first.
    let yaw = -LONDON.lon * DEG - 0.35, pitch = 0.42;
    let target: { yaw: number; pitch: number } | null = null;
    let dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, idleUntil = 0;
    let litF = reduced ? states.length : 0, igniting = false, igniteStart = 0;
    let hover: State | null = null, sel: State | null = null;
    let W = 0, H = 0, R = 0, cx = 0, cy = 0, raf = 0, visible = false, t0 = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W, H) * 0.42; cx = W / 2; cy = H / 2;
    };

    const project = (v: V3) => {
      const [x, y, z] = rotate(v, yaw, pitch);
      return { sx: cx + x * R, sy: cy - y * R, z };
    };

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);

      // Halo + sphere body in chamber red.
      const halo = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.18);
      halo.addColorStop(0, "rgba(176,36,44,0.22)");
      halo.addColorStop(1, "rgba(176,36,44,0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2); ctx.fill();
      const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      body.addColorStop(0, "rgba(120,24,30,0.55)");
      body.addColorStop(1, "rgba(26,7,9,0.9)");
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(214,180,124,0.35)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

      // Continents.
      for (const v of land) {
        const { sx, sy, z } = project(v);
        if (z <= 0) continue;
        ctx.globalAlpha = 0.25 + 0.6 * z;
        ctx.fillStyle = GOLD;
        ctx.fillRect(sx - 0.9, sy - 0.9, 1.8, 1.8);
      }
      ctx.globalAlpha = 1;

      // Arcs from London to the most recently lit countries (front side only).
      const L = toV(LONDON.lat, LONDON.lon);
      const n = Math.floor(litF);
      const arcFrom = igniting ? Math.max(0, n - 10) : n;
      for (let i = arcFrom; i < n; i++) {
        const s = states[i];
        const fade = igniting ? 1 - (n - i) / 10 : 0;
        if (fade <= 0) continue;
        ctx.strokeStyle = `rgba(240,216,168,${(0.55 * fade).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        let pen = false;
        for (let k = 0; k <= 32; k++) {
          const u = k / 32, p = slerp(L, s.v, u), lift = 1 + 0.06 * Math.sin(Math.PI * u);
          const { sx, sy, z } = project([p[0] * lift, p[1] * lift, p[2] * lift]);
          if (z <= 0) { pen = false; continue; }
          if (pen) ctx.lineTo(sx, sy); else { ctx.moveTo(sx, sy); pen = true; }
        }
        ctx.stroke();
      }

      // Country pins.
      for (const s of states) {
        if (s.order >= litF) continue;
        const { sx, sy, z } = project(s.v);
        if (z <= 0.02) continue;
        const justLit = litF - s.order < 6 && igniting;
        const r = justLit ? 3.2 : 2;
        ctx.globalAlpha = 0.35 + 0.65 * z;
        ctx.fillStyle = justLit ? GOLD_HI : RED;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = GOLD_HI; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.arc(sx, sy, r + 1.2, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // London hub.
      {
        const { sx, sy, z } = project(L);
        if (z > 0) {
          const ph = (t % 2.4) / 2.4;
          ctx.strokeStyle = `rgba(240,216,168,${(0.8 * (1 - ph)).toFixed(3)})`; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(sx, sy, 5 + ph * 18, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = GOLD_HI; ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Selected + hovered labels.
      const label = (s: State, strong: boolean) => {
        const { sx, sy, z } = project(s.v);
        if (z <= 0) return;
        if (strong) {
          const ph = (t % 1.6) / 1.6;
          ctx.strokeStyle = `rgba(240,216,168,${(1 - ph).toFixed(3)})`; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(sx, sy, 6 + ph * 22, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = GOLD_HI; ctx.beginPath(); ctx.arc(sx, sy, 4.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.font = `${strong ? 600 : 500} ${strong ? 14 : 12}px ${font}`;
        const text = s.name, w = ctx.measureText(text).width;
        const lx = Math.min(W - w - 14, sx + 12), ly = sy - 12;
        ctx.fillStyle = "rgba(11,6,6,0.82)";
        ctx.fillRect(lx - 6, ly - 13, w + 12, 20);
        ctx.strokeStyle = "rgba(214,180,124,0.5)"; ctx.lineWidth = 1;
        ctx.strokeRect(lx - 6, ly - 13, w + 12, 20);
        ctx.fillStyle = GOLD_HI; ctx.fillText(text, lx, ly + 2);
      };
      if (hover && hover !== sel) label(hover, false);
      if (sel) label(sel, true);
    };

    const step = (now: number) => {
      if (igniting) {
        // Time-based, so a throttled tab still finishes in ~3.4s.
        litF = Math.min(states.length, ((now - igniteStart) / 3400) * states.length);
        if (litF >= states.length) igniting = false;
        setLit(Math.floor(litF));
      }
      if (target) {
        const dy = angDiff(yaw, target.yaw), dp = target.pitch - pitch;
        yaw += dy * 0.08; pitch += dp * 0.08;
        if (Math.abs(dy) < 0.002 && Math.abs(dp) < 0.002) target = null;
      } else if (!dragging && !reduced && now > idleUntil) {
        yaw += 0.0016;
      }
      draw(now);
      if (visible) raf = requestAnimationFrame(step);
    };

    const pick = (ex: number, ey: number) => {
      let best: State | null = null, bd = 10;
      for (const s of states) {
        if (s.order >= litF) continue;
        const { sx, sy, z } = project(s.v);
        if (z <= 0.02) continue;
        const d = Math.hypot(sx - ex, sy - ey);
        if (d < bd) { bd = d; best = s; }
      }
      return best;
    };

    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    const onDown = (e: PointerEvent) => {
      dragging = true; target = null; [lastX, lastY] = [downX, downY] = [e.clientX, e.clientY];
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (dragging) {
        yaw += (e.clientX - lastX) * 0.006;
        pitch = Math.max(-1.2, Math.min(1.2, pitch + (e.clientY - lastY) * 0.006));
        [lastX, lastY] = [e.clientX, e.clientY];
        if (!visible) draw(performance.now());
        return;
      }
      const [x, y] = local(e);
      hover = pick(x, y);
      canvas.style.cursor = hover ? "pointer" : "grab";
      if (!visible) draw(performance.now());
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false; idleUntil = performance.now() + 2500;
      const [x, y] = local(e);
      const hit = pick(x, y);
      if (hit && Math.hypot(e.clientX - downX, e.clientY - downY) < 5) selectRef.current(hit.name);
    };

    selectRef.current = (name: string) => {
      const s = states.find((x) => x.name === name);
      if (!s) return;
      sel = s;
      if (litF <= s.order) { litF = states.length; igniting = false; setLit(states.length); }
      const goal = { yaw: -s.lon * DEG, pitch: Math.max(-1.1, Math.min(1.1, s.lat * DEG)) };
      if (reduced) { yaw = goal.yaw; pitch = goal.pitch; draw(performance.now()); }
      else target = goal;
      idleUntil = performance.now() + 6000;
      setSelected(name);
    };

    resize();
    draw(performance.now());
    const ro = new ResizeObserver(() => { resize(); draw(performance.now()); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) {
        if (!reduced && litF === 0 && !igniting) { igniting = true; igniteStart = performance.now(); }
        raf = requestAnimationFrame(step);
      }
    }, { threshold: 0.25 });
    io.observe(canvas);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    if (reduced) setLit(states.length);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [states, land]);

  const matches = query.trim()
    ? states.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : [];
  const sel = selected ? states.find((s) => s.name === selected) : null;

  return (
    <div className="grid items-center gap-10 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-night-copy/55">Countries open to membership</p>
        <p className="mt-3 flex items-baseline gap-4">
          <span className="text-gilt font-headline text-[clamp(5rem,12vw,9.5rem)] leading-none tabular-nums" aria-hidden="true">
            {lit}
          </span>
          <span className="font-headline text-2xl text-night-copy/60" aria-hidden="true">/ 193</span>
          <span className="sr-only">193 countries — every UN member state</span>
        </p>
        <p className="mt-4 max-w-sm leading-relaxed text-night-copy/75">
          Every UN member state, one London hub. Enterprises from any of them can join — find yours.
        </p>

        <div className="relative mt-8 max-w-sm">
          <label htmlFor="globe-search" className="sr-only">Find your country</label>
          <input
            id="globe-search"
            type="search"
            autoComplete="off"
            placeholder="Find your country…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches[0]) { selectRef.current(matches[0].name); setQuery(""); }
            }}
            className="min-h-11 w-full border-b border-gilt/50 bg-transparent py-2 text-lg text-night-copy placeholder:text-night-copy/40 focus:border-accent-on-night focus:outline-none"
          />
          {matches.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-10 mt-1 border border-gilt/30 bg-night/95 backdrop-blur-md">
              {matches.map((m) => (
                <li key={m.name}>
                  <button
                    type="button"
                    onClick={() => { selectRef.current(m.name); setQuery(""); }}
                    className="flex min-h-11 w-full items-center justify-between px-4 text-left text-night-copy/85 hover:bg-chamber/40 hover:text-accent-on-night"
                  >
                    {m.name}
                    <span className="font-mono text-[10px] text-night-copy/45">No. {m.order + 1}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-5 min-h-12 text-sm text-night-copy/70" aria-live="polite">
          {sel ? (
            <>
              <span className="text-accent-on-night">{sel.name}</span> — open to membership. Lit No. {sel.order + 1} of 193,
              counting outward from London.
            </>
          ) : (
            <span className="text-night-copy/45">Drag the globe to turn it · hover a light for its name.</span>
          )}
        </p>
      </div>
      <div className="relative mx-auto aspect-square w-full max-w-2xl lg:col-span-7">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Globe with the 193 UN member states lit, centred on London"
          className="absolute inset-0 h-full w-full cursor-grab touch-pan-y"
        />
      </div>
    </div>
  );
}
