import Link from "next/link";
import type { ReactNode } from "react";
import { getBrand } from "@/server/brand";
import { Logo } from "./brand";

/** Shared frame for sign-in, registration and recovery pages: the school logo on every screen. */
export async function AuthShell({ title, subtitle, children, wide }: { title: string; subtitle?: string; children: ReactNode; wide?: boolean }) {
  const b = await getBrand();
  return (
    <div className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_20%_10%,#123573,#081634_60%)] px-4 py-10">
      <div className={`w-full ${wide ? "max-w-xl" : "max-w-md"}`}>
        <Link href="/" className="mx-auto mb-5 flex w-fit flex-col items-center gap-2" aria-label="Home">
          <span className="grid size-24 place-items-center rounded-3xl bg-white p-2 shadow-lift"><Logo src={b.logoUrl} alt={`${b.name} logo`} className="size-full" priority /></span>
        </Link>
        <div className="rounded-3xl bg-white p-6 shadow-lift sm:p-8">
          <h1 className="text-center text-xl font-extrabold text-navy-800">{title}</h1>
          {subtitle && <p className="mt-1 text-center text-sm text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-4 text-center text-xs text-white/60">{b.name} · <Link href="/" className="underline">Back to website</Link></p>
      </div>
    </div>
  );
}
