/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { cx } from "./ui/primitives";

/** The school logo, always at its natural aspect ratio. */
export function Logo({ src, className, alt = "Fodan Christian Global Bible School logo", priority }: { src: string; className?: string; alt?: string; priority?: boolean }) {
  return <img src={src} alt={alt} className={cx("object-contain", className)} loading={priority ? "eager" : "lazy"} decoding="async" />;
}

export function BrandLockup({ markUrl, name, short, href = "/", light, subtitle }: { markUrl: string; name: string; short: string; href?: string; light?: boolean; subtitle?: string }) {
  return (
    <Link href={href} className="group flex min-w-0 items-center gap-2.5" aria-label={`${name} — home`}>
      <span className={cx("grid size-11 shrink-0 place-items-center rounded-xl p-1", light ? "bg-white" : "bg-white ring-1 ring-line")}>
        <Logo src={markUrl} alt="" className="size-full" priority />
      </span>
      <span className="min-w-0 leading-tight">
        <span className={cx("block truncate text-[0.95rem] font-extrabold tracking-wide", light ? "text-white" : "text-navy-800")}>{short}</span>
        <span className={cx("block truncate text-[0.6rem] font-semibold uppercase tracking-[0.14em]", light ? "text-gold-400" : "text-gold-600")}>{subtitle ?? name}</span>
      </span>
    </Link>
  );
}
