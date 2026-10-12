import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/app-url";

/** Crawl policy: marketing pages open; the portal, the PII enrolment funnel
 *  and the APIs are off-limits (funnel pages also carry per-page noindex). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/portal/", "/api/", "/sign/", "/pay/", "/status/", "/verify-email/"],
      },
    ],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
