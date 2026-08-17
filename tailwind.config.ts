import type { Config } from "tailwindcss";

/* ─────────────────────────────────────────────────────────────────────────
   LSI design language (audited from londonschoolofinvestors.com, Aug 2026)

   The palette below is a REMAP, not a rename. The codebase already used its
   three scales in strict semantic roles — verified by call-site census:
     ink-*    56/70  bg      → surface, ascending elevation
     ivory-* 273/273 text    → foreground, descending emphasis
     gold-*  115 text + 59 bg → accent
   Inverting `ink` (dark→light) and `ivory` (light→dark) together preserves
   every existing contrast pair across all 58 consuming files, so the whole
   site flips coherently from this one file instead of ~1,000 hand edits.

   Structural lines are the one role that must NOT become red — LSI draws
   card edges in neutral rgba(0,0,0,0.08), reserving #EF463B for buttons and
   accents only. Those call sites use the dedicated `line` token.
   ───────────────────────────────────────────────────────────────────────── */

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Tailwind's default opacity scale is multiples of 5, so `gold-500/8` and
      // `gold-500/12` silently generated nothing: 23 call sites rendered with no
      // tint at all, and `divide-gold-500/8` fell through to preflight's
      // near-white #e5e7eb. Registering the two steps the design actually uses
      // fixes every call site at once and keeps the designed values exact.
      opacity: {
        8: "0.08",
        12: "0.12",
      },
      colors: {
        // ── Surfaces (was: dark ink). 950 stays the most RECESSED step so
        //    `bg-ink-950/60` band tints keep reading as a step back from the
        //    page, and 600 stays the most ELEVATED so cards sit forward.
        ink: {
          950: "#E9ECF2",
          900: "#FFFFFF",
          800: "#F4F5F9",
          700: "#EDEFF4",
          600: "#E3E6EE",
        },
        // ── Foreground (was: light ivory). 50 = strongest heading through
        //    300 = softest caption. Anchored on LSI's own #444F6C heading and
        //    #7B8397 body so type colour matches the reference exactly.
        ivory: {
          50: "#1B2238",
          100: "#2E3852",
          200: "#4A5470",
          300: "#6A7286",
        },
        // ── Accent (was: gold). LSI's red is the single brand colour: every
        //    button, every link accent, the hero emphasis word.
        //    Measured split: LSI's exact #EF463B is 3.74:1 on white — passes
        //    the 3:1 bar for icons and large type (400) but fails 4.5:1 for
        //    the 13px button labels and kickers it carries. 500 is the nearest
        //    red that passes (4.68:1), so primary actions and small accent
        //    text sit there. One-line revert if the client insists on parity
        //    with LSI's own failing hex.
        gold: {
          300: "#F4776D",
          400: "#EF463B",
          500: "#D6392F",
          600: "#C22626",
          700: "#A01D1D",
        },
        // LSI's own #7B8397 body grey is 3.79:1 on white — under AA for the
        // 14–19px copy it sets. #6A7286 keeps the slate character and clears
        // 4.5:1 on both white (4.81) and the #FAFAFA band (4.61).
        mist: "#6A7286",

        // ── New semantic tokens for LSI-specific furniture ──
        // Neutral structural hairline — LSI's rgba(0,0,0,0.08) as a solid.
        line: "#E4E7ED",
        brand: {
          DEFAULT: "#EF463B",
          deep: "#C22626",
          soft: "#F4776D",
        },
        // The full-bleed trust band.
        navy: {
          DEFAULT: "#313C59",
          deep: "#232A42",
          soft: "#444F6C",
        },
        // The contact/CTA band.
        amber: {
          DEFAULT: "#FFAE29",
          deep: "#E09415",
        },
      },
      fontFamily: {
        // Roboto Condensed carries LSI's headings — 700 uppercase for the hero,
        // and a hairline 100 at 40px for section titles, which is the single
        // most recognisable signature of the reference design.
        display: ["var(--font-display)", "Arial Narrow", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Micro-labels (kickers, stat captions, spec chips) — the data-plate
        // register that separates a crafted page from a themed one.
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      // LSI's geometry is sharp: 3px on buttons, near-square cards, no pills.
      // Remapping the scale applies that language everywhere at once; `full`
      // is left intact for avatars and status dots that must stay circular.
      borderRadius: {
        DEFAULT: "3px",
        sm: "2px",
        md: "3px",
        lg: "3px",
        xl: "4px",
        "2xl": "6px",
        "3xl": "8px",
      },
      boxShadow: {
        // Light-ground elevation: soft neutral drop, no glow halo.
        glass: "0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)",
        lift: "0 12px 32px rgba(16, 24, 40, 0.10)",
        // The one coloured shadow — LSI's red CTA lifting on hover.
        glow: "0 8px 24px rgba(239, 70, 59, 0.28)",
        band: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
      },
      // LSI's vertical rhythm is a flat 96px on every band, 228px above the
      // hero. Exposed as spacing steps so sections read as `py-band`.
      spacing: {
        band: "96px",
        "band-sm": "56px",
        hero: "228px",
      },
      animation: {
        aurora: "aurora 18s ease-in-out infinite alternate",
        // ≥45s/loop — a luxury ticker drifts, it never races
        marquee: "marquee 48s linear infinite",
        shimmer: "shimmer 1.8s linear infinite",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        // Continuous breath on hero media: 15s per direction, barely there.
        "slow-pulse": "slowPulse 15s ease-in-out infinite alternate",
      },
      keyframes: {
        aurora: {
          "0%": { transform: "translate(-8%, -6%) rotate(0deg) scale(1)" },
          "50%": { transform: "translate(6%, 4%) rotate(12deg) scale(1.12)" },
          "100%": { transform: "translate(-4%, 8%) rotate(-8deg) scale(1.05)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        slowPulse: {
          from: { transform: "scale(1)" },
          to: { transform: "scale(1.035)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
