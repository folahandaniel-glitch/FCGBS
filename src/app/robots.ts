import type { MetadataRoute } from "next";
import { AI_CRAWLERS, siteBaseUrl } from "@/lib/seo-kit";

export default function robots(): MetadataRoute.Robots {
  const base = siteBaseUrl();
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/student", "/teach", "/apply", "/backend", "/api", "/login"] }, { ...{ userAgent: "*", allow: "/", disallow: ["/admin", "/student", "/teach", "/apply", "/backend", "/api", "/login"] }, userAgent: AI_CRAWLERS }], sitemap: `${base}/sitemap.xml` };
}
