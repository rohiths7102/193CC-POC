"use client";

/**
 * Globe — the consortium's signature visual.
 *
 * "193 countries, one London hub" made literal: a dotted sphere in slow
 * rotation, London held as the fixed bright point, great-circle arcs drawing
 * out to real cities and fading, a faint graticule for volume. Canvas 2D,
 * ~1,400 points, orthographic projection — cheap enough to run at 30fps on
 * a laptop and light enough that the whole thing is ~200 lines with no
 * dependency.
 *
 * Tiering: fine-pointer machines with >4 cores get the live rotation and
 * pointer tilt. Touch, low-power and reduced-motion get ONE rendered frame
 * at a chosen angle and no animation loop — the globe is still there as an
 * illustration, it just does not spend battery turning.
 */

import { useEffect, useRef } from "react";

type V3 = [number, number, number];

const DEG = Math.PI / 180;
const ll = (lat: number, lon: number): V3 => {
  const la = lat * DEG, lo = lon * DEG;
  return [Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)];
};
const LONDON = ll(51.5074, -0.1278);
// Real cities, chosen for spread across the sphere so arcs read in every
// rotation phase rather than bunching in one hemisphere.
const CITIES: { name: string; v: V3 }[] = [
  { name: "New York", v: ll(40.7128, -74.006) },
  { name: "Dubai", v: ll(25.2048, 55.2708) },
  { name: "Singapore", v: ll(1.3521, 103.8198) },
  { name: "Lagos", v: ll(6.5244, 3.3792) },
  { name: "São Paulo", v: ll(-23.5505, -46.6333) },
  { name: "Mumbai", v: ll(19.076, 72.8777) },
  { name: "Sydney", v: ll(-33.8688, 151.2093) },
  { name: "Tokyo", v: ll(35.6762, 139.6503) },
  { name: "Nairobi", v: ll(-1.2921, 36.8219) },
  { name: "Toronto", v: ll(43.6532, -79.3832) },
  { name: "Riyadh", v: ll(24.7136, 46.6753) },
  { name: "Mexico City", v: ll(19.4326, -99.1332) },
];

const slerp = (a: V3, b: V3, t: number): V3 => {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const om = Math.acos(dot);
  if (om < 1e-4) return a;
  const s = Math.sin(om), wa = Math.sin((1 - t) * om) / s, wb = Math.sin(t * om) / s;
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
};

export function Globe({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const live =
      (navigator.hardwareConcurrency ?? 8) > 4 &&
      !window.matchMedia("(hover: none), (pointer: coarse)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Points: fibonacci sphere — even coverage, no polar bunching ──
    const N = 1400;
    const pts: V3[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }

    let W = 0, H = 0, R = 0, cx = 0, cy = 0, DPR = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      DPR = Math.min(2, window.devicePixelRatio || 1);
      W = rect.width; H = rect.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      R = Math.min(W, H) * 0.44; cx = W / 2; cy = H / 2;
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);

    // ── Rotation state ──
    let yaw = -0.6, pitch = 0.32, tPitch = 0.32, tYawOff = 0, yawOff = 0, t = 0, tick = 0, raf = 0;
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      tYawOff = nx * 0.35; tPitch = 0.32 + ny * 0.25;
    };
    if (live) window.addEventListener("pointermove", onMove, { passive: true });

    // Rotate a unit vector by yaw (about Y) then pitch (about X); return
    // screen x, y and depth z (+z toward the viewer).
    const proj = (v: V3, Y: number, P: number): V3 => {
      const cy_ = Math.cos(Y), sy_ = Math.sin(Y);
      const x1 = v[0] * cy_ + v[2] * sy_, z1 = -v[0] * sy_ + v[2] * cy_, y1 = v[1];
      const cp = Math.cos(P), sp = Math.sin(P);
      const y2 = y1 * cp - z1 * sp, z2 = y1 * sp + z1 * cp;
      return [x1, y2, z2];
    };

    // ── Arcs: staggered loop. Each arc draws 0→1 over ~2.6s, holds, fades. ──
    const ARC_PERIOD = 4.2, ARC_STAGGER = 0.85;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const Y = yaw + yawOff, P = pitch;

      // atmosphere
      const glow = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.35);
      glow.addColorStop(0, "rgba(176,36,44,0.30)");
      glow.addColorStop(0.55, "rgba(176,36,44,0.08)");
      glow.addColorStop(1, "rgba(176,36,44,0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2); ctx.fill();

      // limb
      ctx.strokeStyle = "rgba(214,180,124,0.22)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

      // graticule — 5 parallels + 12 meridians, depth-faded
      ctx.lineWidth = 0.7;
      const seg = 72;
      for (let k = -2; k <= 2; k++) {
        const lat = k * 30 * DEG;
        ctx.beginPath();
        for (let i = 0; i <= seg; i++) {
          const lon = (i / seg) * Math.PI * 2;
          const v: V3 = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
          const [x, y, z] = proj(v, Y, P);
          if (z < -0.02) { ctx.moveTo(cx + x * R, cy - y * R); continue; }
          i === 0 ? ctx.moveTo(cx + x * R, cy - y * R) : ctx.lineTo(cx + x * R, cy - y * R);
        }
        ctx.strokeStyle = "rgba(214,180,124,0.10)"; ctx.stroke();
      }
      for (let m = 0; m < 12; m++) {
        const lon = (m / 12) * Math.PI * 2;
        ctx.beginPath();
        for (let i = 0; i <= seg; i++) {
          const lat = -Math.PI / 2 + (i / seg) * Math.PI;
          const v: V3 = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
          const [x, y, z] = proj(v, Y, P);
          if (z < -0.02) { ctx.moveTo(cx + x * R, cy - y * R); continue; }
          i === 0 ? ctx.moveTo(cx + x * R, cy - y * R) : ctx.lineTo(cx + x * R, cy - y * R);
        }
        ctx.strokeStyle = "rgba(214,180,124,0.08)"; ctx.stroke();
      }

      // back hemisphere dots (faint) then front (bright) — painter's order
      for (const pass of [0, 1] as const) {
        for (const v of pts) {
          const [x, y, z] = proj(v, Y, P);
          if (pass === 0 ? z >= 0 : z < 0) continue;
          const sx = cx + x * R, sy = cy - y * R;
          if (pass === 0) {
            ctx.fillStyle = "rgba(214,180,124,0.12)";
            ctx.beginPath(); ctx.arc(sx, sy, 0.8, 0, Math.PI * 2); ctx.fill();
          } else {
            const a = 0.36 + z * 0.55; // brighter toward the viewer
            ctx.fillStyle = `rgba(240,216,168,${a.toFixed(3)})`;
            ctx.beginPath(); ctx.arc(sx, sy, 1.3 + z * 0.7, 0, Math.PI * 2); ctx.fill();
          }
        }
      }

      // arcs from London
      const [lx, ly, lz] = proj(LONDON, Y, P);
      CITIES.forEach((c, i) => {
        const local = ((t + i * ARC_STAGGER) % ARC_PERIOD) / ARC_PERIOD; // 0..1
        const grow = Math.min(1, local / 0.62);          // draw phase
        const fade = local > 0.78 ? 1 - (local - 0.78) / 0.22 : 1; // fade phase
        if (grow <= 0 || fade <= 0) return;
        const steps = 48;
        ctx.beginPath();
        let started = false;
        for (let s = 0; s <= steps * grow; s++) {
          const u = s / steps;
          const p = slerp(LONDON, c.v, u);
          const lift = 1 + 0.16 * Math.sin(Math.PI * u);
          const [x, y, z] = proj([p[0] * lift, p[1] * lift, p[2] * lift], Y, P);
          if (z < -0.08) { started = false; continue; }
          const sx = cx + x * R, sy = cy - y * R;
          if (!started) { ctx.moveTo(sx, sy); started = true; } else ctx.lineTo(sx, sy);
        }
        ctx.strokeStyle = `rgba(240,216,168,${(0.85 * fade).toFixed(3)})`;
        ctx.lineWidth = 1.2; ctx.stroke();
        // arrival dot
        if (grow >= 1) {
          const [x, y, z] = proj(c.v, Y, P);
          if (z > 0) {
            ctx.fillStyle = `rgba(240,216,168,${(0.9 * fade).toFixed(3)})`;
            ctx.beginPath(); ctx.arc(cx + x * R, cy - y * R, 2.2, 0, Math.PI * 2); ctx.fill();
          }
        }
      });

      // London — fixed bright point with a breathing ring
      if (lz > -0.05) {
        const sx = cx + lx * R, sy = cy - ly * R;
        const ph = (t % 2.2) / 2.2;
        ctx.strokeStyle = `rgba(214,60,66,${(0.7 * (1 - ph)).toFixed(3)})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(sx, sy, 4 + ph * 16, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#D6B47C";
        ctx.beginPath(); ctx.arc(sx, sy, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath(); ctx.arc(sx, sy, 1.3, 0, Math.PI * 2); ctx.fill();
      }
    };

    if (!live) { yaw = -0.85; draw(); return () => ro.disconnect(); }

    const frame = () => {
      tick++;
      if (tick % 2 === 0) { raf = requestAnimationFrame(frame); return; } // 30fps
      t += 1 / 30;
      yaw += 0.0026;                       // one revolution ≈ 80s
      yawOff += (tYawOff - yawOff) * 0.05; // pointer tilt eases in
      pitch += (tPitch - pitch) * 0.05;
      draw();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("pointermove", onMove); };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" role="presentation" />;
}
