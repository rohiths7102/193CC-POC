/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/**
 * Brand identity — 193 Countries Consortium Ltd (Companies House 14499310).
 * Official roundel sourced from the organisation's own site
 * (193countriesconsortium.com): dark indigo disc #131233, white curved
 * wordmark, dotted ring, network-globe in magenta→violet→azure gradient.
 * `Roundel` renders the official PNG; `Crest` is a faithful vector mini-mark
 * (node globe on indigo) for favicon-scale contexts.
 */
export function Roundel({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/193cc-logo.png"
      alt="193 Countries Consortium"
      width={size}
      height={size}
      className={cn("rounded-full", className)}
    />
  );
}

export function Crest({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cc-net" x1="16" y1="14" x2="50" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#BA60A4" />
          <stop offset="0.5" stopColor="#9878B6" />
          <stop offset="1" stopColor="#0F9BD7" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill="#131233" />
      {/* dotted ring */}
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return <circle key={i} cx={32 + 25 * Math.cos(a)} cy={32 + 25 * Math.sin(a)} r="1.1" fill="#FFFFFF" opacity="0.85" />;
      })}
      {/* network globe: nodes + links */}
      <g stroke="url(#cc-net)" strokeWidth="1.1" opacity="0.95">
        <path d="M20 26 L32 18 L44 25 M20 26 L26 38 L32 46 M26 38 L40 40 M32 18 L26 38 M44 25 L40 40 L32 46 M20 26 L44 25 M24 31 L37 30 L40 40 M37 30 L32 18" fill="none" />
      </g>
      {[
        [32, 18, 2.6], [20, 26, 2.2], [44, 25, 2.4], [26, 38, 2.4],
        [40, 40, 2.6], [32, 46, 2.2], [24, 31, 1.8], [37, 30, 2.0],
        [48, 33, 1.6], [16, 33, 1.5], [36, 13, 1.4], [28, 51, 1.4],
      ].map(([x, y, r], i) => (
        <circle key={`n${i}`} cx={x} cy={y} r={r} fill="url(#cc-net)" />
      ))}
    </svg>
  );
}

/** Lockup: official roundel + typeset wordmark. `stacked` for centred contexts. */
export function Logo({
  size = 34, stacked = false, className, wordmarkClassName,
}: { size?: number; stacked?: boolean; className?: string; wordmarkClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", stacked && "flex-col gap-2.5 text-center", className)}>
      <Roundel size={stacked ? size * 1.6 : size} />
      <span className={cn("leading-tight", wordmarkClassName)}>
        <span className="block font-display text-[1.05em] tracking-wide text-ivory-50">
          193 Countries <span className="text-gold-grad">Consortium</span>
        </span>
        <span className="mt-0.5 block text-[0.52em] font-sans font-medium uppercase tracking-[0.34em] text-mist">
          Membership · London
        </span>
      </span>
    </span>
  );
}
