/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Landmark, ArrowRight, Newspaper } from "lucide-react";
import { db } from "@/server/db";
import { ukDate, titleCase } from "@/lib/utils";
import { GlassCard, Badge, Avatar, LinkButton } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

/** Social unfurl: pasting a profile link into LinkedIn/WhatsApp renders a
 *  branded card (paired with opengraph-image.tsx alongside this file). */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await db.user.findFirst({
    where: { profileSlug: slug.toLowerCase(), profilePublic: true, role: "MEMBER" },
    select: { name: true, company: true, profileBio: true },
  });
  if (!member) return { title: "Profile not found" };
  const title = `${member.company ?? member.name} — 193 Countries Consortium`;
  return {
    title,
    description: member.profileBio ?? "Member of the 193 Countries Consortium — summits at the House of Lords, UK Parliament.",
    openGraph: { title, description: member.profileBio ?? "Member of the 193 Countries Consortium." },
    twitter: { card: "summary_large_image", title },
  };
}

/** PUBLIC member profile — no login required. Renders ONLY when the owner has
 *  switched their profile to public. Award status is live from the Summit. */
export default async function PublicProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await db.user.findFirst({
    where: { profileSlug: slug.toLowerCase(), profilePublic: true, role: "MEMBER" },
    include: {
      memberships: { where: { status: "ACTIVE" }, include: { product: true } },
      articles: { where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 1 },
    },
  });
  if (!member) notFound();

  const awardApp = await db.slotApplication.findFirst({
    where: { userId: member.id, category: { kind: "AWARD" }, status: { notIn: ["CANCELLED", "EXPIRED"] } },
    include: { category: { include: { summit: { include: { event: true } } } } },
  });

  const tier = member.memberships[0]?.product;
  const article = member.articles[0];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="aurora animate-aurora left-[10%] top-[-4rem] h-[26rem] w-[26rem] bg-ink-600" />
        <div className="aurora animate-aurora right-[5%] top-[16rem] h-[22rem] w-[22rem] bg-gold-700/40 [animation-delay:-8s]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-sm"><Logo size={34} /></Link>
        <LinkButton href="/join" variant="ghost" size="sm">Become a member</LinkButton>
      </header>

      <div className="relative z-10 mx-auto max-w-4xl px-6 pb-24 pt-10">
        <Reveal>
          <GlassCard strong className="overflow-hidden">
            {/* banner strip in brand gradient */}
            <div className="h-2 w-full bg-gradient-to-r from-[#BA60A4] via-[#9878B6] to-[#0F9BD7]" />
            <div className="p-8 md:p-10">
              <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                {member.logoPath ? (
                  <img src={`/api/public-assets/${member.logoPath}`} alt={`${member.company ?? member.name} logo`}
                    className="h-24 w-24 rounded-2xl border hairline bg-ink-800 object-contain p-2" />
                ) : (
                  <Avatar name={member.company ?? member.name} className="h-24 w-24 text-2xl" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-500">
                    Member of the 193 Countries Consortium
                  </p>
                  <h1 className="mt-1.5 font-display text-4xl text-ivory-50">{member.company ?? member.name}</h1>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {tier && <Badge tone="gold">{tier.name}</Badge>}
                    {awardApp && (
                      <Badge tone={awardApp.status === "CONFIRMED" ? "gold" : "purple"}>
                        <Award className="h-3 w-3" />
                        {awardApp.status === "CONFIRMED" ? "Business Award — Confirmed" : "Business Award — Nominated"}
                      </Badge>
                    )}
                  </div>
                </div>
                {member.photoPath && (
                  <img src={`/api/public-assets/${member.photoPath}`} alt={member.name}
                    className="h-24 w-24 rounded-full border-2 border-gold-500/40 object-cover" />
                )}
              </div>

              {member.profileBio && (
                <p className="mt-7 max-w-2xl text-base leading-8 text-ivory-200/85">{member.profileBio}</p>
              )}

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {awardApp && (
                  <div className="rounded-2xl border hairline bg-ink-800/40 p-5">
                    <div className="flex items-center gap-2 text-gold-400"><Award className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-widest">UK Investors Summit</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ivory-200/85">
                      {awardApp.status === "CONFIRMED" ? "Confirmed for the Business Award at " : "Nominated for the Business Award at "}
                      <span className="text-ivory-50">{awardApp.category.summit.event.name}</span> — {ukDate(awardApp.category.summit.event.startsAt)}.
                    </p>
                  </div>
                )}
                <div className="rounded-2xl border hairline bg-ink-800/40 p-5">
                  <div className="flex items-center gap-2 text-gold-400"><Landmark className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-widest">The Consortium</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ivory-200/85">
                    A collaborative business partner platform — enterprises from 193 countries standing together for
                    international growth, with summits held at the House of Lords, UK Parliament.
                  </p>
                </div>
              </div>

              {article && (
                <div className="mt-6 rounded-2xl border hairline bg-ink-800/40 p-5">
                  <div className="flex items-center gap-2 text-gold-400"><Newspaper className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-widest">Featured story</p>
                  </div>
                  <h2 className="mt-2 font-display text-xl text-ivory-50">{article.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-7 text-ivory-200/75">{article.body}</p>
                </div>
              )}
            </div>
          </GlassCard>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-10 text-center">
            <p className="text-sm text-mist">Want your enterprise on this stage?</p>
            <LinkButton href="/join" className="mt-4">Explore membership <ArrowRight className="h-4 w-4" /></LinkButton>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
