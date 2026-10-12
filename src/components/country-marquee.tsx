/**
 * CountryMarquee — "193 countries" made tangible.
 *
 * Two rows of member-state names in the site's condensed hairline, drifting
 * in opposite directions at a luxury-ticker pace (≥45s per loop — it drifts,
 * it never races). Pure CSS animation, so it costs a compositor transform and
 * nothing else; content is duplicated once for the seamless wrap. Edges are
 * masked to fade so the rows appear to pass under the sections either side.
 *
 * Server component — no client JS. `.marquee-pause` (globals.css) stops the
 * drift on hover so a name can be read.
 */

const ROW_A = [
  "United Kingdom", "United States", "India", "Nigeria", "Germany", "France", "Japan", "Brazil",
  "Canada", "Australia", "Singapore", "United Arab Emirates", "South Africa", "Kenya", "Italy", "Spain",
  "Netherlands", "Switzerland", "Sweden", "Norway", "Ireland", "Portugal", "Poland", "Türkiye",
  "Saudi Arabia", "Qatar", "Egypt", "Morocco", "Ghana", "Ethiopia", "Pakistan", "Bangladesh",
];
const ROW_B = [
  "Mexico", "Argentina", "Chile", "Colombia", "Peru", "China", "Republic of Korea", "Indonesia",
  "Malaysia", "Thailand", "Viet Nam", "Philippines", "New Zealand", "Israel", "Jordan", "Greece",
  "Austria", "Belgium", "Denmark", "Finland", "Czechia", "Hungary", "Romania", "Ukraine",
  "Kazakhstan", "Uzbekistan", "Sri Lanka", "Nepal", "Rwanda", "Tanzania", "Uganda", "Senegal",
];

function Row({ names, reverse }: { names: string[]; reverse?: boolean }) {
  const list = [...names, ...names]; // duplicate for the seamless loop
  return (
    <div className="marquee-pause overflow-hidden mask-[linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
      <ul
        className={`flex w-max items-center gap-0 whitespace-nowrap ${reverse ? "animate-marquee [animation-direction:reverse]" : "animate-marquee"}`}
        aria-hidden
      >
        {list.map((n, i) => (
          <li key={i} className="flex items-center">
            <span className="px-5 font-display text-[22px] font-thin uppercase tracking-[0.06em] text-white/70 sm:px-7 sm:text-[26px]">{n}</span>
            <span className="h-1 w-1 rounded-full bg-gold-300/70" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CountryMarquee({ className }: { className?: string }) {
  return (
    <div className={className} aria-label="Member countries">
      <Row names={ROW_A} />
      <div className="h-2" />
      <Row names={ROW_B} reverse />
    </div>
  );
}
