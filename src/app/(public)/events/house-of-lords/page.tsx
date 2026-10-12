import { db } from "@/server/db";
import { appUrl } from "@/lib/app-url";
import { ukDate } from "@/lib/utils";
import { Badge } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { GuideShell, GuideSection, Callout, FaqBlock, GuideCta, CheckItem } from "@/components/editorial";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Attending a Business Event at the House of Lords — What to Expect",
  description:
    "How private business events at the House of Lords actually work: invitations and peer sponsorship, the entrance and security procedure, dress code, photography rules and etiquette — from an organisation that hosts them.",
  alternates: { canonical: "/events/house-of-lords" },
};

export default async function HouseOfLordsGuide() {
  const nextEvent = await db.event.findFirst({
    where: { kind: "MAIN_EVENT", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
  });

  const eventLd = nextEvent
    ? {
        "@context": "https://schema.org",
        "@type": "BusinessEvent",
        name: nextEvent.name,
        startDate: nextEvent.startsAt.toISOString(),
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: { "@type": "Place", name: nextEvent.venue, address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" } },
        organizer: { "@type": "Organization", name: "193 Countries Consortium", url: appUrl() },
      }
    : null;

  return (
    <GuideShell
      kicker="Events · The definitive guide"
      title={<>Attending a business event at the <span className="text-gold-grad">House of Lords</span></>}
      dek="The consortium has held its receptions and summits at the House of Lords since 2023. This is the practical guide we send our own guests — invitations, entrances, security, dress and etiquette — checked against the parliamentary rules."
      updated="July 2026"
      backHref="/guides"
      backLabel="All guides"
    >
      {eventLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd) }} />}

      <Callout tone="note">
        193 Countries Consortium Ltd is an independent membership organisation. We are not part of, affiliated
        with, or endorsed by the House of Lords or UK Parliament — private functions there are governed by the
        House’s own rules, summarised below from parliament.uk.
      </Callout>

      {nextEvent && (
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-gold-500/8 px-6 py-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-500">Next consortium event</p>
              <p className="mt-1 font-display text-lg text-ivory-50">{nextEvent.name}</p>
            </div>
            <Badge tone="gold">{ukDate(nextEvent.startsAt)}</Badge>
          </div>
        </Reveal>
      )}

      <GuideSection title="How private events at the Lords work">
        <p>
          Business functions inside the House of Lords happen in one of two ways. The traditional route is a
          <strong className="text-ivory-50"> Member-sponsored event</strong>: a Member of the House of Lords
          sponsors the booking and must personally attend the event. Since a 2018 rule change there is also a
          <strong className="text-ivory-50"> non-sponsored route</strong>, where an approved outside organisation
          books directly with the House&rsquo;s events team, subject to additional due-diligence checks.
        </p>
        <p>
          Two House rules shape the character of every event there. First, functions may not be used for direct
          or indirect financial gain — you will never see selling from the floor at a Lords reception. Second,
          the House publishes a public log of banqueting events, so an event&rsquo;s name and sponsor become part
          of the public record. Both rules are why an evening there feels — and is — different from a hotel
          function.
        </p>
      </GuideSection>

      <GuideSection title="The rooms">
        <p>
          Most business receptions take place in the <strong className="text-ivory-50">Cholmondeley Room and
          Terrace</strong> — the House&rsquo;s principal function room, with private access to a stretch of
          terrace directly over the Thames (weather permitting). It holds up to 160 guests for a reception or
          120 for a seated dinner. Smaller gatherings use the <strong className="text-ivory-50">Attlee and Reid
          Room</strong> (up to 60 for a reception), and other bookable spaces include the Peers&rsquo; Dining
          Room, the Home Room, Committee Room G and the River Room.
        </p>
      </GuideSection>

      <GuideSection title="Getting in: entrance, timing and security">
        <p>
          <strong className="text-ivory-50">Check your invitation for the entrance</strong> — it changed
          recently. Black Rod&rsquo;s Garden Entrance, long the events entrance, closed indefinitely in 2025 for
          the Victoria Tower repair works. Weekday event guests now use the
          <strong className="text-ivory-50"> Victoria Tower Gardens Visitor Entrance</strong> (open from 08:00,
          closes promptly at 19:45); events in the Peers&rsquo; Dining Room and all weekend events use the
          Cromwell Green Entrance. The nearest Underground station is Westminster.
        </p>
        <ul className="mt-5! space-y-3">
          <CheckItem>Bring your <strong className="text-ivory-50">printed invitation</strong> and <strong className="text-ivory-50">photographic ID</strong> — security can refuse entry without them.</CheckItem>
          <CheckItem>Arrive <strong className="text-ivory-50">at least 30 minutes early</strong>. Everyone passes airport-style screening and the queue forms outside; allow up to 45 minutes at busy times.</CheckItem>
          <CheckItem>Travel light: no luggage over 60 × 40&nbsp;cm, and there are no cloakrooms. Knives, tools, banners, flags and slogan-bearing clothing are not admitted.</CheckItem>
          <CheckItem>Wear your visitor pass visibly at all times, and stay with your host or a passholder outside the event room — that is the rule, not a formality.</CheckItem>
        </ul>
      </GuideSection>

      <GuideSection title="Dress code and etiquette">
        <p>
          Parliament sets no official dress code, but the Lords events team asks guests to avoid jeans, hoodies,
          shorts and trainers — and the event organiser&rsquo;s stated code governs. For consortium events that
          means <strong className="text-ivory-50">business attire</strong>. Beyond dress: arrive on time (the
          entrance closes early by hotel standards), address your hosts naturally rather than performing
          protocol, and remember the no-selling rule — the room rewards conversation, not pitches.
        </p>
        <p>
          <strong className="text-ivory-50">Photography deserves special mention.</strong> Inside the Palace of
          Westminster, photography at private events is permitted only in the hired room, only with a permit
          arranged in advance, and strictly for private use — images may not be published externally, including
          on social media. That is a House rule protecting the Lords&rsquo; neutrality. If you see a
          photographer at a consortium event, that is the permitted official photography; your own photos are
          for your private record only.
        </p>
      </GuideSection>

      <GuideSection title="How to be in the room">
        <p>
          You cannot buy a ticket to a private Lords function — you attend by invitation of the host
          organisation. The consortium&rsquo;s receptions are a membership benefit: Individual members attend in
          delegate capacity, and enterprise members&rsquo; cumulative credited payments unlock the Major Event
          automatically at £2,600. Every event we hold appears on members&rsquo; dashboards the moment booking
          opens.
        </p>
      </GuideSection>

      <FaqBlock
        faqs={[
          {
            q: "Can anyone book an event at the House of Lords?",
            a: "Private functions are either sponsored by a Member of the House of Lords, who must attend, or booked directly by an approved organisation through the House's events team under its due-diligence process. Events may not be used for commercial gain, and bookings appear in the House's public banqueting log.",
          },
          {
            q: "What ID do I need to attend an event at the House of Lords?",
            a: "Bring your printed invitation and photographic ID (passport or driving licence). Security may refuse entry without them; if you have no photo ID, bring an alternative such as a registered bank card, though photo ID is strongly advised.",
          },
          {
            q: "Is there a dress code at the House of Lords?",
            a: "There is no official parliamentary dress code, but guests are asked to avoid jeans, hoodies, shorts and trainers, and the event organiser's stated code applies. Business attire is the norm at business functions, including ours.",
          },
          {
            q: "Can I take photos at a House of Lords event?",
            a: "Only in the hired event room, only where a photography permit has been arranged, and strictly for private use — House rules do not allow images from private events to be published externally, including on social media.",
          },
          {
            q: "Which entrance do I use for a House of Lords event?",
            a: "Check your invitation. Since 2025, weekday event guests use the Victoria Tower Gardens Visitor Entrance (Black Rod's Garden Entrance is closed for repair works); Peers' Dining Room and weekend events use the Cromwell Green Entrance. Arrive at least 30 minutes before your function begins.",
          },
        ]}
      />

      <GuideCta
        heading="Attend as a member"
        sub="Consortium receptions at the House of Lords are a membership benefit — Individual members attend as delegates, and the Major Event unlocks automatically at £2,600 credited."
        href="/join"
        label="Become a member"
      />
    </GuideShell>
  );
}
