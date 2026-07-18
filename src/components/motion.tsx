"use client";

import { motion, useInView, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

/** Scroll-triggered entrance. */
export function Reveal({
  children, delay = 0, y = 26, className,
}: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.65, 0.28, 0.99] }}
    >
      {children}
    </motion.div>
  );
}

/** Staggered children on first view. */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 24, scale: 0.98 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.21, 0.65, 0.28, 0.99] } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Spring count-up number (money, stats). prefix/suffix are strings so server
 *  components can pass them across the client boundary. */
export function AnimatedNumber({
  value, prefix = "", suffix = "", className,
}: { value: number; prefix?: string; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 55, damping: 18 });
  const fmt = (n: number) => `${prefix}${Math.round(n).toLocaleString("en-GB")}${suffix}`;

  useEffect(() => { if (inView) mv.set(value); }, [inView, value, mv]);
  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = fmt(v);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spring, prefix, suffix]);

  return <span ref={ref} className={className}>{fmt(0)}</span>;
}

/** Animated wallet ring — draws progress toward the £2,600 threshold. */
export function ProgressRing({
  fraction, size = 168, stroke = 10, label, sublabel,
}: { fraction: number; size?: number; stroke?: number; label: string; sublabel?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, fraction));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-ink-700" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          strokeLinecap="round" stroke="url(#goldgrad)"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c * (1 - clamped) }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: [0.22, 0.8, 0.25, 1] }}
        />
        <defs>
          <linearGradient id="goldgrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8CF9A" />
            <stop offset="100%" stopColor="#C6A15B" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-2xl text-ivory-50">{label}</span>
        {sublabel && <span className="mt-1 text-[11px] uppercase tracking-widest text-mist">{sublabel}</span>}
      </div>
    </div>
  );
}

/** Soft page transition wrapper for portal content. */
export function PageFx({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.21, 0.65, 0.28, 0.99] }}
    >
      {children}
    </motion.div>
  );
}

/** Hover-lift card shell. */
export function LiftCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
    >
      {children}
    </motion.div>
  );
}

export { motion, AnimatePresence };
