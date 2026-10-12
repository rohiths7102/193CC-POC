import Link from "next/link";
import { Landmark, Clock, Users, FileSignature, ListChecks, ArrowRight } from "lucide-react";
import { db } from "@/server/db";
import { appUrl } from "@/lib/app-url";
import { ukDate } from "@/lib/utils";
import { SLOT_KIND_LABEL } from "@/lib/labels";
import { GlassCard, Badge, LinkButton } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Countdown } from "@/components/showcase";
import { GuideShell, GuideSection, Callout, FaqBlock, GuideCta } from "@/components/editorial";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "UK Investors Summit — Pitch, Launch or Be Recognised",
  description:
    "The 193 Countries Consortium's UK Investors Summit: 45 slots across three categories — business-opportunity presentations before an investor panel, brand launches and business awards. How the intent-letter process works and how to apply.",
  alternates: { canonical: "/summit" },
};

const CATEGORY_COPY: Record<string, string> = {
  PRESENTATION: "Pitch one business opportunity to the assembled investor panel. Expressions of interest are captured live on the platform and followed up after the event.",
  BRAND_LAUNCH: "Unveil a brand, product or venture on the Summit stage, amplified afterwards by the consortium's featured-video benefit.",
  AWARD: "Recognition before the consortium's international membership — nominated, confirmed and recorded through the platform.",
};

export default async function SummitHub() {
  const now = new Date();
  const [next, past] = await Promise.all([
    db.event.findFirst({
      where: { kind: "SUMMIT", startsAt: { gte: now } },
      include: { summit: { include: { categories: { include: { applications: { where: { status: "CONFIRMED" } } } } } } },
      orderBy: { startsAt: "asc" },
    }),
    db.event.findMany({
      where: { kind: "SUMMIT", startsAt: { lt: now } },
      orderBy: { startsAt: "desc" },
      take: 6,
    }),
  ]);

  const eventLd = next
    ? {
        "@context": "https://schema.org",
        "@type": "BusinessEvent",
        name: next.name,
        startDate: next.startsAt.toISOString(),
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        location: { "@type": "Place", name: next.venue, address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" } },
        organizer: { "@type": "Organization", name: "193 Countries Consortium", url: appUrl() },
        offers: {
          "@type": "Offer",
          name: "Temporary Membership — one Summit slot",
          url: `${appUrl()}/join/TEMPORARY`,
          availability: "https://schema.org/InStock",
          priceCurrency: "GBP",
        },
      }
    : null;

  return (
    <GuideShell
      kicker="The UK Investors Summit"
      hero={{ src: "/images/summit-2023-address.jpg", alt: "A speaker addresses the UK Investors Summit at the House of Lords", caption: "UK Investors Summit · House of Lords · 2023" }}
      title={<>Forty-five slots. Three stages. <span className="text-gold-grad">One room that matters.</span></>}
      dek="The consortium's flagship investor event: business-opportunity pitches before an investor panel, live brand launches and the business awards — followed by investor networking. Every slot is allocated through a formal intent-letter process, run entirely on this platform."
    >
      {eventLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd) }} />}

      {/* Next summit — live from the platform */}
      {next?.summit ? (
        <Reveal>
          <section>
            <GlassCard strong className="p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Landmark className="h-5 w-5 text-gold-400" />
                    <h2 className="font-display text-2xl text-ivory-50">{next.name}</h2>
                    <Badge tone="green">Applications open</Badge>
                  </div>
                  <p className="mt-2 text-sm text-mist">{next.venue} · {ukDate(next.startsAt, true)}</p>
                </div>
                <LinkButton href="/join/TEMPORARY" className="shine">Apply for a Summit slot <ArrowRight className="h-4 w-4" /></LinkButton>
              </div>
              <div className="mt-7 flex flex-wrap items-end gap-10 border-t hairline pt-6">
                <Countdown target={next.startsAt.toISOString()} label="Summit begins in" />
                <Countdown target={next.summit.deadlineAt.toISOString()} label="Intent-letter deadline closes in" />
              </div>
            </GlassCard>
          </section>
        </Reveal>
      ) : (
        <Callout tone="note">
          The next Summit date will be announced here. Members are invited first — enterprise members hold a
          guaranteed annual slot entitlement.
        </Callout>
      )}

      {/* Categories with live capacity */}
      <Reveal>
        <section>
          <h2 className="font-display text-2xl leading-snug text-ivory-50 md:text-3xl">Three categories, fifteen slots each</h2>
          <Stagger className="mt-6 grid gap-4 md:grid-cols-3 lg:-mx-24">
            {(next?.summit?.categories ?? []).map((c) => (
              <StaggerItem key={c.id}>
                <GlassCard className="flex h-full flex-col p-5">
                  <div className="flex items-center justify-between">
                    <Badge tone={c.applications.length >= c.capacity ? "red" : "green"}>
                      <Users className="h-3 w-3" /> {c.applications.length}/{c.capacity}
                    </Badge>
                  </div>
                  <h3 className="mt-3 font-display text-lg leading-snug text-ivory-50">{SLOT_KIND_LABEL[c.kind]}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-mist">{CATEGORY_COPY[c.kind]}</p>
                </GlassCard>
              </StaggerItem>
            ))}
            {!next?.summit && (
              <>
                {(["PRESENTATION", "BRAND_LAUNCH", "AWARD"] as const).map((k) => (
                  <StaggerItem key={k}>
                    <GlassCard className="flex h-full flex-col p-5">
                      <h3 className="font-display text-lg leading-snug text-ivory-50">{SLOT_KIND_LABEL[k]}</h3>
                      <p className="mt-2 flex-1 text-sm leading-6 text-mist">{CATEGORY_COPY[k]}</p>
                    </GlassCard>
                  </StaggerItem>
                ))}
              </>
            )}
          </Stagger>
        </section>
      </Reveal>

      {/* The process */}
      <GuideSection title="How slots are allocated — the intent-letter process">
        <p>
          Summit slots are not first-come, first-served. Each of the three categories is capped at fifteen
          places per event, allocated through a formal process that runs end-to-end on this platform:
        </p>
        <ol className="mt-5! space-y-3">
          {[
            { icon: <ListChecks className="h-4 w-4" />, t: "Pre-acceptance", d: "Enterprise members are invited to a category by the organising team; applicants on the event-linked Temporary Membership choose their category at enrolment." },
            { icon: <FileSignature className="h-4 w-4" />, t: "Signed intent letter", d: "Invited members upload a signed intent letter through their dashboard before the published deadline. Submissions close automatically at the deadline — to the minute." },
            { icon: <Users className="h-4 w-4" />, t: "Confirmation or waitlist", d: "Slots are confirmed against capacity. If a category is full you join a numbered waitlist; any cancellation automatically promotes the next applicant, who receives a time-limited offer." },
            { icon: <Clock className="h-4 w-4" />, t: "One opportunity per event", d: "One member, one slot, one category, per Summit — the same standard for every applicant." },
          ].map((s, i) => (
            <li key={s.t} className="flex gap-4 rounded-xl border hairline bg-ink-800/40 px-5 py-4">
              <span className="mt-0.5 rounded-lg bg-gold-500/12 p-2 text-gold-400">{s.icon}</span>
              <span>
                <strong className="text-ivory-50">{i + 1}. {s.t}.</strong>{" "}
                <span className="text-sm leading-7 text-mist">{s.d}</span>
              </span>
            </li>
          ))}
        </ol>
      </GuideSection>

      {/* Past summits */}
      {past.length > 0 && (
        <GuideSection title="Past summits">
          <ul className="mt-5! space-y-3">
            {past.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border hairline bg-ink-800/40 px-5 py-4">
                <span className="text-sm text-ivory-100">{e.name}</span>
                <span className="text-xs text-mist">{e.venue} · {ukDate(e.startsAt)}</span>
              </li>
            ))}
          </ul>
        </GuideSection>
      )}

      <FaqBlock
        faqs={[
          {
            q: "Who can apply for a Summit slot?",
            a: "Enterprise members hold an annual Summit slot entitlement as part of their membership. Non-members can apply through the event-linked Temporary Membership, choosing their category — presentation, brand launch or business award — at enrolment.",
          },
          {
            q: "What happens if my category is full?",
            a: "You join a numbered waitlist. If a confirmed slot is cancelled, the next applicant is promoted automatically and receives a time-limited offer to accept — there is no need to chase the organisers.",
          },
          {
            q: "What is the intent letter?",
            a: "A short signed letter confirming your intention to take up the slot, uploaded through your member dashboard before the published deadline. The deadline is enforced automatically by the platform.",
          },
          {
            q: "Can I hold slots in two categories at the same Summit?",
            a: "No — the standard is one opportunity, one event, per member per annum. You may apply again at the next Summit.",
          },
        ]}
      />

      <GuideCta
        heading="Ready to take the stage?"
        sub="Apply for a Summit slot through the event-linked membership, or join as an enterprise member and hold a guaranteed annual entitlement."
        href="/join/TEMPORARY"
        label="Apply for a Summit slot"
      />

      <p className="text-center text-xs text-mist">
        Comparing options? <Link href="/join" className="text-gold-300 underline decoration-gold-500/40 underline-offset-2">See all membership tiers</Link>.
      </p>
    </GuideShell>
  );
}
