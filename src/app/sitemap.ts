import type { MetadataRoute } from "next";
import { listCourses, listProgrammes } from "@/server/services/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const [progs, courses] = await Promise.all([listProgrammes(), listCourses()]);
  const fixed = ["", "/about", "/vision-mission", "/statement-of-faith", "/leadership", "/programmes", "/courses", "/departments", "/admissions", "/faculty", "/ministry-formation", "/fivefold-ministry", "/technology-hub", "/kingdom-enterprise", "/library", "/news", "/faq", "/contact", "/verify"];
  return [...fixed.map((p) => ({ url: `${base}${p}` })), ...progs.map((p) => ({ url: `${base}/programmes/${p.slug}` })), ...courses.map((c) => ({ url: `${base}/courses/${c.code}` }))];
}
