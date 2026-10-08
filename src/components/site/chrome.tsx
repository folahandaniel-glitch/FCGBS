import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { getBrand } from "@/server/brand";
import { getContent } from "@/server/services/content";
import { BrandLockup, Logo } from "../brand";
import { buttonClass } from "../ui/primitives";
import { MobileNav } from "./mobile-nav";

export async function SiteHeader() {
  const [brand, nav] = await Promise.all([getBrand(), getContent("nav")]);
  const items = nav.items.filter((i) => (i.href === "/technology-hub" ? brand.flags.techHub : i.href === "/kingdom-enterprise" ? brand.flags.kingdomHub : i.href === "/library" ? brand.flags.library : true));
  return (
    <>
      {brand.site.announcementBar && <div className="bg-navy-900 px-4 py-2 text-center text-xs font-semibold text-gold-400 sm:text-sm">{brand.site.announcementBar}</div>}
      <header className="sticky top-0 z-50 border-b border-line/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <BrandLockup markUrl={brand.markUrl} name={brand.name} short={brand.shortName} subtitle="Christian Global Bible School" />
          <nav aria-label="Primary" className="hidden items-center gap-0.5 xl:flex">
            {items.map((l) => (
              <Link key={l.href} href={l.href} prefetch={false} className="whitespace-nowrap rounded-lg px-2.5 py-2 text-[0.82rem] font-semibold text-navy-800/85 hover:bg-royal-50 hover:text-royal-700">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 xl:flex">
            <Link href="/login" className={buttonClass("ghost", "sm")}>Sign in</Link>
            <Link href="/apply" className={buttonClass("gold", "sm")}>Apply now</Link>
          </div>
          <MobileNav links={[{ href: "/", label: "Home" }, ...items, { href: "/verify", label: "Verify a Certificate" }, { href: "/faq", label: "FAQs" }, { href: "/contact", label: "Contact" }]} />
        </div>
      </header>
    </>
  );
}

export async function SiteFooter() {
  const brand = await getBrand();
  const year = new Date().getFullYear();
  const col = (title: string, links: [string, string][]) => (
    <div>
      <p className="text-sm font-bold text-white">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="hover:text-white">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <footer className="bg-navy-900 text-white/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-16 place-items-center rounded-2xl bg-white p-1.5">
              <Logo src={brand.markUrl} alt="" className="size-full" />
            </span>
            <div>
              <p className="font-extrabold tracking-wide text-white">{brand.shortName}</p>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-gold-400">{brand.name}</p>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">{brand.site.footerNote}</p>
          <p className="mt-3 max-w-sm text-xs italic text-white/55">“{brand.motto}” — {brand.mottoRef}</p>
        </div>
        {col("Study", [["/programmes", "Programmes"], ["/courses", "Courses"], ["/departments", "Departments"], ["/fivefold-ministry", "Fivefold Ministry"], ["/ministry-formation", "Ministry Formation"], ["/technology-hub", "Technology Hub"], ["/kingdom-enterprise", "Kingdom Enterprise"]])}
        {col("School", [["/about", "About FCGBS"], ["/vision-mission", "Vision & Mission"], ["/statement-of-faith", "Statement of Faith"], ["/leadership", "Founder & Leadership"], ["/faculty", "Faculty"], ["/admissions", "Admissions"], ["/library", "Library"], ["/news", "News & Events"], ["/verify", "Verify a Certificate"]])}
        <div>
          <p className="text-sm font-bold text-white">Contact</p>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li className="flex items-center gap-2"><Phone className="size-4 text-gold-400" aria-hidden /><a href={`tel:${brand.phone.replace(/\s/g, "")}`} className="hover:text-white">{brand.phone}</a></li>
            <li className="flex items-center gap-2"><Mail className="size-4 text-gold-400" aria-hidden /><a href={`mailto:${brand.email}`} className="break-all hover:text-white">{brand.email}</a></li>
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-gold-400" aria-hidden /><span>{brand.address}</span></li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <Link href="/policies/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/policies/terms" className="hover:text-white">Terms</Link>
            <Link href="/faq" className="hover:text-white">FAQs</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <Link href="/login" className="rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20">Student Login</Link>
            <Link href="/backend" className="rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20">Faculty / Admin Login</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-1 px-4 py-5 text-center text-xs text-white/60 sm:px-6">
          <p>© {year} {brand.name}. {brand.parentMinistry}.</p>
          <p>Institutional programmes — no external accreditation is claimed unless published by the institution.</p>
          {brand.site.showPoweredBy && brand.site.poweredBy && <p className="font-medium text-white/80">{brand.site.poweredBy}</p>}
        </div>
      </div>
    </footer>
  );
}
