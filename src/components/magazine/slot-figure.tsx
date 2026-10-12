"use client";

/**
 * Fig. — the Summit's 45 slots as 3 columns of 15 marks.
 *
 * `confirmed` comes from the database for an upcoming Summit only; with no
 * Summit scheduled every mark is an open outline. The figure never shows
 * numbers that are not real (demo/past data stays out of the public page).
 */

import { motion } from "framer-motion";

export type SlotColumn = { label: string; capacity: number; confirmed: number | null };

export function SlotFigure({ columns, caption }: { columns: SlotColumn[]; caption: string }) {
  return (
    <figure className="w-full">
      <div className="grid grid-cols-3 gap-6 sm:gap-10">
        {columns.map((col, c) => (
          <div key={col.label}>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {Array.from({ length: col.capacity }, (_, i) => {
                const filled = col.confirmed !== null && i < col.confirmed;
                return (
                  <motion.span
                    key={i}
                    data-reveal
                    aria-hidden
                    className={`block aspect-square rounded-full border ${filled ? "border-accent-on-night bg-accent-on-night" : "border-night-copy/35"}`}
                    initial={{ opacity: 0, scale: 0.4 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.5, delay: c * 0.15 + i * 0.025, ease: [0.16, 1, 0.3, 1] }}
                  />
                );
              })}
            </div>
            <p className="mt-4 border-t border-night-copy/20 pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-night-copy/70">
              {col.label}
            </p>
            <p className="mt-1 font-headline text-2xl text-night-copy">
              {col.confirmed === null ? `${col.capacity} slots` : `${col.capacity - col.confirmed} of ${col.capacity} open`}
            </p>
          </div>
        ))}
      </div>
      <figcaption className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-night-copy/55">{caption}</figcaption>
    </figure>
  );
}
