"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const STEPS = ["Details", "Contract", "Payment", "Active"];
const HINTS = ["~5 min", "~5 min", "~5 min", ""];

export function Steps({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <div>
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <motion.span
                initial={false}
                animate={{ scale: active ? 1.12 : 1 }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                  done && "border-gold-500 bg-gold-500 text-ink-950",
                  active && "border-gold-400 bg-gold-500/15 text-gold-300 shadow-glow",
                  !done && !active && "border-gold-500/20 text-mist"
                )}
              >
                {done ? "✓" : n}
              </motion.span>
              <span className={cn("text-[10px] uppercase tracking-widest", active ? "text-gold-300" : "text-mist/70")}>{label}</span>
              {HINTS[i] && <span className="text-[9px] text-mist/50">{HINTS[i]}</span>}
            </div>
            {n < STEPS.length && (
              <div className="relative mx-2 mb-5 h-px flex-1 bg-gold-500/15">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gold-500"
                  initial={{ width: 0 }}
                  animate={{ width: done ? "100%" : "0%" }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
    <p className="mt-3 text-center text-[10px] uppercase tracking-[0.28em] text-mist/50">
      No paperwork · about 20 minutes end to end
    </p>
    </div>
  );
}

/** Animated verification tracker shown on the status page while an
 *  organisation's documents are under admin review. */
export function VerificationTimeline() {
  const nodes = [
    { label: "Documents received", state: "done" as const },
    { label: "Under review", state: "active" as const },
    { label: "Membership activates", state: "todo" as const },
  ];
  return (
    <div className="mx-auto mt-6 max-w-sm text-left">
      {nodes.map((n, i) => (
        <div key={n.label} className="flex gap-4">
          <div className="flex flex-col items-center">
            <motion.span
              initial={false}
              animate={n.state === "active" ? { scale: [1, 1.25, 1] } : {}}
              transition={n.state === "active" ? { repeat: Infinity, duration: 1.8 } : {}}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold",
                n.state === "done" && "border-emerald-400 bg-emerald-400/15 text-emerald-300",
                n.state === "active" && "border-gold-400 bg-gold-500/15 text-gold-300 shadow-glow",
                n.state === "todo" && "border-gold-500/20 text-mist/60"
              )}
            >
              {n.state === "done" ? "✓" : i + 1}
            </motion.span>
            {i < nodes.length - 1 && <span className="my-1 h-7 w-px bg-gold-500/20" />}
          </div>
          <div className="pb-4 pt-1">
            <p className={cn("text-sm", n.state === "todo" ? "text-mist/70" : "text-ivory-100")}>{n.label}</p>
            {n.state === "active" && (
              <p className="mt-0.5 text-xs text-mist">Our team is checking your organisation documents — usually completed the same day.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
