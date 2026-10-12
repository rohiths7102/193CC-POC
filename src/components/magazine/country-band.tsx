"use client";

/**
 * The 193 UN member states the consortium's name refers to, set as two rows
 * of serif names that slide in opposite directions as the page scrolls past —
 * scroll-linked, so the rows move only when the reader does. A name turns
 * gilt under the pointer. Reduced motion: MotionConfig drops nothing here
 * (transforms come from scroll, not animation), so the rows are simply
 * shorter than the viewport's travel and read as static.
 */

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const ROWS = [
  [
    "United Kingdom", "India", "United Arab Emirates", "Nigeria", "Singapore", "United States", "Kenya",
    "Saudi Arabia", "Germany", "Malaysia", "Ghana", "France", "Qatar", "Sri Lanka", "Japan", "Brazil",
  ],
  [
    "South Africa", "Canada", "Hungary", "Pakistan", "Australia", "Egypt", "Kazakhstan", "Italy",
    "Bangladesh", "Mexico", "Rwanda", "Türkiye", "Indonesia", "Spain", "Uzbekistan", "Ireland",
  ],
] as const;

export function CountryBand() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const forward = useTransform(scrollYProgress, [0, 1], ["0%", "-35%"]);
  const back = useTransform(scrollYProgress, [0, 1], ["-35%", "0%"]);

  return (
    <div ref={ref} className="overflow-hidden py-6" aria-label="Open to enterprises from all 193 UN member states">
      {ROWS.map((row, r) => (
        <motion.ul
          key={r}
          aria-hidden="true"
          style={{ x: r === 0 ? forward : back }}
          className="flex w-max items-center whitespace-nowrap py-2"
        >
          {[...row, ...row].map((name, i) => (
            <li key={i} className="flex items-center">
              <span className="px-6 font-headline text-[clamp(2rem,4.2vw,3.75rem)] leading-none text-night-copy/80 transition-colors duration-500 hover:text-accent-on-night">
                {r === 1 && i % 3 === 1 ? <em>{name}</em> : name}
              </span>
              <span className="h-1.5 w-1.5 rotate-45 bg-gilt" />
            </li>
          ))}
        </motion.ul>
      ))}
    </div>
  );
}
