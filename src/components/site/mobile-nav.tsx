"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonClass, cx } from "../ui/primitives";

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  // The menu is "open for this path" — navigating anywhere closes it without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === path;
  const setOpen = (fn: (o: boolean) => boolean) => setOpenAt(fn(open) ? path : null);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <div className="xl:hidden">
      <button type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)} className="grid size-11 place-items-center rounded-xl text-navy-800 ring-1 ring-line">
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-[4.25rem] z-40 overflow-y-auto border-t border-line bg-white px-4 pb-10 pt-4">
          <nav aria-label="Mobile">
            <ul className="grid gap-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={cx("block rounded-xl px-4 py-3 text-[0.95rem] font-semibold", path === l.href ? "bg-royal-50 text-royal-700" : "text-navy-800 hover:bg-surface")}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-5 grid gap-2">
            <Link href="/apply" className={buttonClass("primary", "lg")}>
              Apply Now
            </Link>
            <Link href="/login" className={buttonClass("secondary", "lg")}>
              Sign In
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
