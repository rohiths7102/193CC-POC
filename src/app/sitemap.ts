import type { MetadataRoute } from "next";
import { db } from "@/server/db";
import { appUrl } from "@/lib/app-url";

/** DB-driven sitemap: static marketing pages, active tier pages, and every
 *  member profile whose owner has made it public. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/join`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/summit`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/events/house-of-lords`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/guides`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/guides/investor-readiness`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/guides/uk-business-membership-compared`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const [products, profiles] = await Promise.all([
    db.product.findMany({ where: { active: true }, select: { code: true } }),
    db.user.findMany({
      where: { profilePublic: true, profileSlug: { not: null }, role: "MEMBER" },
      select: { profileSlug: true },
    }),
  ]);

  return [
    ...staticPages,
    ...products.map((p) => ({
      url: `${base}/join/${p.code}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...profiles.map((u) => ({
      url: `${base}/profile/${u.profileSlug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
