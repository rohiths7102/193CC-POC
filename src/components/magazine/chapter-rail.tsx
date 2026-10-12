"use client";

/**
 * The chapter rail — fixed on the right edge of wide screens once the cover
 * has scrolled away. A gilt seal at the top turns with the reader's progress
 * through the page; below it the chapter numbers, the current one lit, joined
 * by a hairline that fills as the page is read. Each number jumps to its
 * chapter.
 */

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export type RailChapter = { id: string; n: string; title: string };

export function ChapterRail({ chapters }: { chapters: RailChapter[] }) {
  const { scrollYProgress, scrollY } = useScroll();
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 540]);
  const [active, setActive] = useState<string | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => scrollY.on("change", (y) => setShown(y > window.innerHeight * 0.7)), [scrollY]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    chapters.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [chapters]);

  const idx = chapters.findIndex((c) => c.id === active);

  return (
    <motion.nav
      aria-label="Chapters"
      className="fixed right-5 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center lg:flex"
      initial={false}
      animate={{ opacity: shown ? 1 : 0, x: shown ? 0 : 16, pointerEvents: shown ? "auto" : "none" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* The seal: a gilt ring of lettering around the crest, turning with progress. */}
      <div className="relative h-16 w-16">
        <motion.svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" style={{ rotate }} aria-hidden="true">
          <defs>
            <path id="seal-ring" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
          </defs>
          <circle cx="50" cy="50" r="46" fill="none" stroke="var(--gilt)" strokeOpacity="0.55" strokeWidth="0.8" />
          <text fill="var(--accent)" fontSize="9.2" letterSpacing="3.1" fontFamily="var(--font-jetbrains-mono), monospace">
            <textPath href="#seal-ring">193 COUNTRIES · ONE LONDON HUB ·</textPath>
          </text>
        </motion.svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/193cc-logo.png" alt="" width={30} height={30} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" />
      </div>

      <ol className="relative mt-5 flex flex-col items-center gap-4">
        <span aria-hidden="true" className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-gilt/25" />
        <motion.span
          aria-hidden="true"
          className="absolute left-1/2 top-1 w-px -translate-x-1/2 bg-accent"
          animate={{ height: idx < 0 ? 0 : `${(idx / Math.max(1, chapters.length - 1)) * 100}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
        {chapters.map((c) => {
          const on = c.id === active;
          return (
            <li key={c.id} className="relative">
              <a
                href={`#${c.id}`}
                aria-label={`${c.n} ${c.title}`}
                aria-current={on ? "true" : undefined}
                className={`group flex h-8 w-8 items-center justify-center rounded-full border font-mono text-[10px] transition-colors duration-500 ${
                  on ? "border-accent bg-night text-accent-on-night" : "border-gilt/30 bg-night/80 text-copy-muted hover:text-copy"
                }`}
              >
                {c.n}
                <span className="pointer-events-none absolute right-11 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-copy-soft opacity-0 transition-opacity group-hover:opacity-100">
                  {c.title}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </motion.nav>
  );
}
