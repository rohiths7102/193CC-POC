import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GlassCard({
  children, className, strong, ...rest
}: React.HTMLAttributes<HTMLDivElement> & { children?: ReactNode; className?: string; strong?: boolean }) {
  return (
    <div className={cn(strong ? "glass-strong" : "glass", "rounded-2xl shadow-glass", className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ kicker, title, sub, className }: { kicker?: string; title: ReactNode; sub?: string; className?: string }) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {kicker && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-gold-500">{kicker}</p>}
      <h2 className="font-display text-3xl leading-tight text-ivory-50 md:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-base leading-7 text-mist">{sub}</p>}
    </div>
  );
}

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
const btnStyles = {
  gold: "bg-gradient-to-r from-gold-400 to-gold-600 text-ink-950 hover:shadow-glow hover:brightness-110",
  ghost: "border border-gold-500/30 text-ivory-100 hover:border-gold-500/70 hover:bg-gold-500/10",
  dark: "bg-ink-700/70 text-ivory-100 hover:bg-ink-600",
  danger: "border border-red-400/40 text-red-300 hover:bg-red-500/10",
} as const;
const btnSizes = { sm: "px-4 py-1.5 text-xs", md: "px-6 py-2.5 text-sm", lg: "px-8 py-3.5 text-base" } as const;

export function Button({
  children, variant = "gold", size = "md", className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof btnStyles; size?: keyof typeof btnSizes;
}) {
  return (
    <button className={cn(btnBase, btnStyles[variant], btnSizes[size], className)} {...props}>
      {children}
    </button>
  );
}

export function LinkButton({
  href, children, variant = "gold", size = "md", className,
}: { href: string; children: ReactNode; variant?: keyof typeof btnStyles; size?: keyof typeof btnSizes; className?: string }) {
  return (
    <Link href={href} className={cn(btnBase, btnStyles[variant], btnSizes[size], className)}>
      {children}
    </Link>
  );
}

const badgeTones: Record<string, string> = {
  gold: "bg-gold-500/15 text-gold-300 border-gold-500/30",
  green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  blue: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  red: "bg-red-500/15 text-red-300 border-red-500/30",
  grey: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  purple: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

export function Badge({ children, tone = "gold", className }: { children: ReactNode; tone?: keyof typeof badgeTones; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider", badgeTones[tone], className)}>
      {children}
    </span>
  );
}

export const STATUS_TONE: Record<string, keyof typeof badgeTones> = {
  ACTIVE: "green", CONFIRMED: "green", SIGNED: "green", DELIVERED: "green", PUBLISHED: "green", APPROVED: "green", COMPLETE: "green", WON: "green", SENT: "blue",
  AWAITING_SIGNATURE: "blue", AWAITING_PAYMENT: "blue", INTENT_SUBMITTED: "blue", SUBMITTED: "blue", IN_REVIEW: "blue", BOOKED: "blue", SCHEDULED: "blue", IN_PRODUCTION: "blue", QUALIFIED: "blue", PROPOSAL: "blue", CONTACTED: "blue", OPEN: "green", NEW: "grey",
  WAITLISTED: "purple", OFFERED: "purple", INVITED: "gold", DRAFT: "grey", PENDING: "grey", BRIEF_SUBMITTED: "blue",
  PENDING_VERIFICATION: "purple",
  LAPSED: "red", CANCELLED: "red", EXPIRED: "red", DECLINED: "red", CHANGES_REQUESTED: "red", AT_RISK: "red", NO_SHOW: "red", LOST: "red", CLOSED: "grey", SUSPENDED: "red",
};

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-mist">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-mist/70">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-gold-500/20 bg-ink-800/70 px-4 py-2.5 text-sm text-ivory-100 placeholder:text-mist/50 focus:border-gold-500/60 focus:outline-none transition-colors";

export function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mist">{label}</p>
      <p className={cn("mt-2 font-display text-3xl", accent ? "text-gold-grad" : "text-ivory-50")}>{value}</p>
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b hairline">
            {head.map((h) => (
              <th key={h} className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-mist">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gold-500/8">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-5 py-3.5 align-middle text-ivory-200/90", className)}>{children}</td>;
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ink-600 to-ink-800 text-xs font-semibold text-gold-300 ring-1 ring-gold-500/30", className)}>
      {name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}
    </span>
  );
}

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="glass rounded-2xl px-8 py-14 text-center">
      <p className="font-display text-xl text-ivory-100">{title}</p>
      {sub && <p className="mt-2 text-sm text-mist">{sub}</p>}
    </div>
  );
}

export function DemoTag({ children = "Simulated" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-300">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse-soft" /> {children}
    </span>
  );
}
