import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GlassCard({
  children, className, strong, ...rest
}: React.HTMLAttributes<HTMLDivElement> & { children?: ReactNode; className?: string; strong?: boolean }) {
  return (
    <div className={cn(strong ? "glass-strong" : "glass", "rounded-2xl", className)} {...rest}>
      {children}
    </div>
  );
}

/**
 * LSI sets section titles in Roboto Condensed at weight 100 / 40px — that
 * hairline-at-large-size is the most recognisable signature of the reference
 * design, so `font-thin` here is load-bearing, not decoration.
 *
 * `align` defaults to left because the console lays these out in left-aligned
 * columns; the marketing pages pass "center" to match LSI's own centring.
 */
export function SectionTitle({
  kicker, title, sub, className, align = "left",
}: { kicker?: string; title: ReactNode; sub?: string; className?: string; align?: "left" | "center" }) {
  const centered = align === "center";
  return (
    <div className={cn("max-w-3xl", centered && "mx-auto text-center", className)}>
      {kicker && (
        <p className={cn(
          "mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-gold-500",
          centered && "justify-center",
        )}>
          <span className="h-px w-8 bg-gold-500/40" aria-hidden />
          {kicker}
        </p>
      )}
      {/* 40 → 48/56px: the hairline weight needs size to read as intent, and
          ivory-50 (near-black navy) rather than the mid ink so it has
          presence on white. Pages mark the accent phrase with `.title-accent`
          (700, red) — thin ink + bold red in one line is LSI's own hero move. */}
      <h2 className="text-balance font-display text-[38px] font-thin leading-[1.05] tracking-[-0.01em] text-ivory-50 sm:text-[48px] lg:text-[56px]">{title}</h2>
      {/* Hairline that draws in under the title on reveal — a small crafted
          gesture; CSS-only via .title-rule + the section's whileInView. */}
      <span aria-hidden className={cn("title-rule mt-6 block h-px w-14 origin-left bg-gold-500/70", centered && "mx-auto origin-center")} />
      {sub && <p className="mt-5 text-[17px] leading-[1.7] text-ivory-200 sm:text-[19px]">{sub}</p>}
    </div>
  );
}

/* LSI's button: flat fill, 3px radius, no shadow, 13px/600 at 1.2px tracking,
   `transition: 0.3s`. The `rounded` below resolves to 3px via the remapped
   radius scale in tailwind.config.ts. */
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded font-semibold tracking-[1.2px] transition-all duration-300 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none";
const btnStyles = {
  gold: "bg-gold-500 text-white hover:bg-gold-600 hover:shadow-glow",
  ghost: "border border-line bg-ink-800 text-ivory-100 hover:border-gold-500 hover:text-gold-500",
  dark: "bg-navy text-white hover:bg-navy-deep",
  // Now that the brand colour IS red, a filled red destructive button would
  // read as the primary action. Destructive stays outline-only so the two
  // never blur together.
  danger: "border border-gold-600/45 bg-ink-800 text-gold-600 hover:bg-gold-600 hover:text-white",
} as const;
// Touch-target floors (WCAG 2.5.5 / Apple HIG = 44px). Previously sm rendered
// at 28px and md at 41px, both under the minimum on a phone; min-h-* raises
// the hit area without changing the visual weight of the button.
const btnSizes = {
  sm: "min-h-11 px-4 py-1.5 text-[11px] lg:min-h-0",
  md: "min-h-11 px-6 py-2.5 text-[13px] lg:min-h-0",
  // LSI's own hero CTA metrics: 13px label, 36px side padding, optically
  // top-weighted vertical padding (18px over 15px).
  lg: "min-h-[52px] px-9 pb-[15px] pt-[18px] text-[13px]",
} as const;

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

// Rebalanced for a light ground: a 15% tint that read as a soft glow on navy
// is an invisible wash on white, so fills drop to 10% and each label takes the
// 600/700 step of its own hue to hold contrast against it.
const badgeTones: Record<string, string> = {
  gold: "bg-gold-500/10 text-gold-600 border-gold-500/25",
  green: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  blue: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  red: "bg-red-500/15 text-red-300 border-red-400/30",
  grey: "bg-stone-500/15 text-stone-300 border-stone-400/30",
  purple: "bg-violet-500/15 text-violet-300 border-violet-400/30",
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
      {hint && <span className="mt-1 block text-xs text-mist">{hint}</span>}
    </label>
  );
}

// text-base (16px) on phones is not a style choice: iOS Safari auto-zooms the
// whole page when a focused input's font-size is under 16px, which yanks the
// layout sideways mid-form. Drops to text-sm from lg: upward, so desktop
// density is unchanged. min-h-11 gives a 44px touch target.
export const inputCls =
  "w-full min-h-11 rounded border border-line bg-ink-800 px-4 py-3 text-base lg:py-2.5 lg:text-sm text-ivory-100 placeholder:text-mist focus:border-gold-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500/80 transition-colors";

export function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mist">{label}</p>
      <p className={cn("mt-2 font-display text-3xl font-light", accent ? "text-gold-500" : "text-ivory-50")}>{value}</p>
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    // Every console table is a horizontal scroller below ~560px, and iOS draws
    // no scrollbar until you already guessed to swipe — so columns looked absent
    // rather than off-screen, and a keyboard user could not scroll it at all.
    // role+tabIndex make it focusable and announced; the gradient uses `local`
    // attachment so it travels with the content and disappears at the end of the
    // scroll, unlike a fixed mask that stays put and washes out the last column.
    // The cue sits on an INNER div because .glass sets the `background`
    // shorthand (resetting background-image/-size/-attachment) and is emitted
    // after Tailwind's utilities, so it would overwrite the cue.
    <div className="glass rounded-2xl">
      <div
        role="region"
        aria-label="Table — scrolls sideways"
        tabIndex={0}
        className="overflow-x-auto rounded-2xl bg-[linear-gradient(to_left,rgba(255,255,255,0.96),transparent)] bg-right bg-no-repeat bg-local bg-size-[40px_100%] lg:bg-none"
      >
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b hairline bg-ink-800">
            {head.map((h) => (
              <th key={h} className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-mist">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      </div>
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-5 py-3.5 align-middle text-ivory-200", className)}>{children}</td>;
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white ring-1 ring-line", className)}>
      {name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}
    </span>
  );
}

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="glass rounded-2xl px-8 py-14 text-center">
      <p className="font-display text-xl font-light text-ivory-100">{title}</p>
      {sub && <p className="mt-2 text-sm text-mist">{sub}</p>}
    </div>
  );
}

export function DemoTag({ children = "Simulated" }: { children?: ReactNode }) {
  return (
    // Label in ink, not amber: #E09415 text on a near-white chip is ~2.3:1.
    // The amber dot + border carry the "simulated" warning colour instead.
    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-deep/50 bg-amber/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-ivory-100">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-deep animate-pulse-soft" /> {children}
    </span>
  );
}
