"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Animated horizontal bar list — dependency-free reporting visual.
 *  prefix/suffix are strings so server components can pass them. */
export function Bars({ data, prefix = "", suffix = "" }: { data: { label: string; value: number; hint?: string }[]; prefix?: string; suffix?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-4">
      {data.map((d, i) => (
        <div key={d.label}>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="text-ivory-200/90">{d.label}</span>
            <span className="font-medium text-gold-300">{prefix}{d.value.toLocaleString("en-GB")}{suffix}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink-700">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600"
              initial={{ width: 0 }}
              whileInView={{ width: `${(d.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: i * 0.08, ease: [0.22, 0.8, 0.25, 1] }}
            />
          </div>
          {d.hint && <p className="mt-1 text-[11px] text-mist/70">{d.hint}</p>}
        </div>
      ))}
    </div>
  );
}

/** Donut fraction display for fill rates. */
export function Donut({ fraction, label, sub, size = 110 }: { fraction: number; label: string; sub: string; size?: number }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.min(1, Math.max(0, fraction));
  return (
    // flex-wrap so the label drops under the ring in a narrow grid cell. The
    // 110px SVG cannot shrink, so ring + gap + an unbreakable label word needs
    // ~210px of min-content, but the Reports cells are only 122-149px at every
    // laptop width — the labels ran over the neighbouring donut and the last one
    // spilled outside the card, which has no overflow clip.
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={10} className="stroke-ink-700" />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={10} strokeLinecap="round"
            stroke="#C6A15B" strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            whileInView={{ strokeDashoffset: c * (1 - f) }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: [0.22, 0.8, 0.25, 1] }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-lg text-ivory-50">
          {Math.round(f * 100)}%
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-ivory-50">{label}</p>
        <p className="text-xs text-mist">{sub}</p>
      </div>
    </div>
  );
}
