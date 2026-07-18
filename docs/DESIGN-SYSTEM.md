# Design System — "Regal Dynamic"

The visual language of the 193 Countries Consortium membership platform. One system across the public site and all six portals — components live in `src/components/`, tokens in `tailwind.config.ts` + `src/app/globals.css`. If it's not in here, don't invent it — extend this file first.

---

## 1. Brand identity

### Logo — `src/components/logo.tsx`
| Export | Use | Notes |
|---|---|---|
| `<Crest size />` | Favicon-scale mark, footer, watermarks | Original crest: globe meridians (193 countries), laurel base (awards), coronet star (House of Lords events), double gold ring. **Deliberately original — never imitate the Parliamentary portcullis (protected emblem).** |
| `<Logo size stacked />` | Nav, sidebar, login | Crest + wordmark lockup: "193 Countries **Consortium**" (Playfair) over "MEMBERSHIP · LONDON" (letterspaced Inter caps). `stacked` for centred contexts (login). Wordmark scales from the parent `font-size` — set `text-base`/`text-sm` on the wrapper. |
| `src/app/icon.svg` | Browser favicon | Auto-served by Next.js; ink rounded square + gold crest. |

**Placement rules:** top-left on every surface; footer uses lone `Crest`; never place the gold crest on gold or light backgrounds without the ink tile behind it.

### Voice
Assured, warm, precise. "Your seat at the table is one signature away" — never salesy filler. Money, dates and statuses are always concrete (£2,600, 18 July 17:00, UNLOCKED).

---

## 2. Design tokens (`tailwind.config.ts`)

### Colour
| Token | Hex | Role |
|---|---|---|
| `ink-950 → 600` | `#060B16 → #1B2E58` | Backgrounds, elevated surfaces (900 is the page base) |
| `gold-300 → 700` | `#E8CF9A → #83652F` | THE brand accent: actions, focus, progress, icons. 500 `#C6A15B` is canonical |
| `ivory-50 → 300` | `#FBF9F4 → #DDD2B8` | Text on ink; 50 = headings, 100 = body |
| `mist` | `#8FA3C8` | Secondary text, labels, hints |
| Semantic | emerald / sky / violet / red @ 300 + `/15` bg | Status only — never decorative (see `STATUS_TONE` in `ui.tsx`) |

Gradients: `text-gold-grad` (headline emphasis), button `from-gold-400 to-gold-600`. Glass surfaces: `.glass` / `.glass-strong` (blur 18/24px, gold-tinted 1px border). Film grain: `.grain` on `<body>` at 5% opacity.

### Typography
| Role | Font | Usage |
|---|---|---|
| Display | Playfair Display (`font-display`, `--font-display`) | h1–h3, stat numerals, signature preview |
| UI/body | Inter (`font-sans`) | Everything else |
| Labels | Inter 11px semibold, `uppercase tracking-[0.22em] text-mist` | Field labels, table heads, kickers |

Scale: hero `text-5xl→7xl`, page titles `text-3xl`, cards `text-lg→xl`, body `text-sm`, hints `text-xs`.

### Spacing & shape
Radii: cards `rounded-2xl`, inputs `rounded-xl`, actions `rounded-full` (pill = interactive). Page padding `px-5 md:px-10`; card padding `p-5–p-8`. Shadows: `shadow-glass` (ambient), `shadow-glow` (gold emphasis), `shadow-lift` (hover).

### Motion (framer-motion; durations in `tailwind.config.ts` keyframes)
| Pattern | Component | Spec |
|---|---|---|
| Scroll entrance | `Reveal` / `Stagger`+`StaggerItem` | y-26→0, 0.7s, cubic-bezier(0.21,0.65,0.28,0.99), 90ms stagger, once |
| Count-up | `AnimatedNumber` | spring (stiffness 55, damping 18); **prefix/suffix are strings** — functions cannot cross the server→client boundary |
| Progress ring | `ProgressRing` | stroke-dashoffset draw, 1.6s |
| Page transition | `PageFx` | fade+rise 0.5s on portal content |
| Nav active | `layoutId="nav-active"` | spring slide between items |
| Ambient | `.animate-aurora` (18s), `.animate-marquee` (36s), `.shimmer` | hero/loading only |
| Hover | `LiftCard` y-6; buttons `active:scale-[0.98]` | |

**Reduced motion:** global `@media (prefers-reduced-motion: reduce)` kills all of it. Never bypass.

---

## 3. Components (`src/components/ui.tsx` unless noted)

| Component | Variants / states | Notes |
|---|---|---|
| `Button` / `LinkButton` | `gold` (primary, one per view) · `ghost` · `dark` · `danger`; sm/md/lg; disabled + pending (spinner via `Submit` in `forms.tsx`) | Pills. Gold = the single most important action on screen |
| `GlassCard` | default / `strong` (modals, primary panels) | Passes through div props (incl. `dangerouslySetInnerHTML` for contract HTML) |
| `Badge` + `STATUS_TONE` | gold/green/blue/red/grey/purple | **Every status string renders through `STATUS_TONE`** — never hand-pick status colours |
| `Field` + `inputCls` | label/hint slot; error via `FormError` (red panel) | All inputs share `inputCls`; focus = gold border + global gold focus ring |
| `Table` / `Td` | glass wrapper, min-width + `overflow-x-auto` | Mobile scrolls inside the card, page never scrolls sideways |
| `Stat`, `Avatar`, `Empty`, `DemoTag` | — | `DemoTag` marks every simulated integration — **honesty is a design token here** |
| `ProgressRing`, `Bars`, `Donut` (`motion.tsx`/`charts.tsx`) | — | Reporting + wallet visuals; animated once in view |
| `Steps` (`steps.tsx`) | 4-step enrolment: Details→Contract→Payment→Active | Gold fill line animates on progress |
| `PortalShell` (`sidebar.tsx`) | Desktop rail + mobile drawer; role-filtered nav | Nav items come from `portal/layout.tsx` per role — reachability: any action ≤2 clicks from dashboard |

### Forms pattern (`forms.tsx`)
Every mutation = server action + `useActionState`; `Submit` shows a spinner while pending; errors return as `{error}` rendered by `FormError`; destructive/override actions **require a reason field** (audited). No optimistic UI on money or slots — the server answer is the truth.

---

## 4. Accessibility
- Keyboard: global `:focus-visible` gold ring; all actions are real `<button>`/`<a>`.
- Contrast: ivory-on-ink ≥ 12:1; mist-on-ink ≥ 4.6:1; gold reserved for large text/emphasis.
- Status badges pair colour with text (never colour-only).
- `prefers-reduced-motion` respected globally; marquee/aurora are decorative only.
- Images/uploads constrained; icons are `aria-hidden` with adjacent text labels.

## 5. Do / Don't
| ✅ Do | ❌ Don't |
|---|---|
| Use `STATUS_TONE` for any status | Hardcode hex values in pages (tokens only) |
| One gold button per view | Multiple competing gold CTAs |
| Gate UI from `/me/entitlements` server truth | Hide-in-UI as a security measure |
| Label simulations with `DemoTag` | Fake a live integration |
| Extend this file when adding a pattern | Invent one-off styles in a page |
