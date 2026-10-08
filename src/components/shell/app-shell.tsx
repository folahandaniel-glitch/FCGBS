"use client";

/* eslint-disable @next/next/no-img-element */
import { Bell, LogOut, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cx } from "../ui/primitives";

export interface NavItem {
  href: string;
  label: string;
  /** Server-rendered icon element (keeps the client bundle small). */
  icon: ReactNode;
  badge?: number;
}
export interface NavGroup {
  title?: string;
  items: NavItem[];
}

function isActive(path: string, href: string, root: string) {
  return href === root ? path === root : path === href || path.startsWith(`${href}/`);
}

export function AppShell({
  groups,
  root,
  markUrl,
  user,
  roleLabel,
  unread,
  logout,
  children,
  searchable,
  banner,
}: {
  groups: NavGroup[];
  root: string;
  markUrl: string;
  user: { name: string; email: string; avatarUrl?: string | null };
  roleLabel: string;
  unread: number;
  logout: () => Promise<void>;
  children: ReactNode;
  searchable?: boolean;
  banner?: ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  // Drawer is open "for this path": any navigation closes it without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === path;
  const setOpen = (v: boolean) => setOpenAt(v ? path : null);
  const [q, setQ] = useState("");

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 px-4">
        <span className="grid size-10 place-items-center rounded-xl bg-white p-1">
          <img src={markUrl} alt="FCGBS logo" className="size-full object-contain" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[0.86rem] font-extrabold tracking-wide text-white">FCGBS</p>
          <p className="truncate text-[0.6rem] font-semibold tracking-[0.18em] text-gold-400">{roleLabel}</p>
        </div>
      </div>
      <nav aria-label="Main" className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
        {groups.map((g, gi) => (
          <div key={gi} className={cx(gi > 0 && "mt-5")}>
            {g.title && <p className="mb-1.5 px-3 text-[0.64rem] font-bold uppercase tracking-[0.16em] text-white/40">{g.title}</p>}
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = isActive(path, it.href, root);
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      prefetch={false}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "group flex items-center gap-3 rounded-xl px-3 py-2 text-[0.86rem] font-semibold transition-colors",
                        active ? "bg-white text-navy-800 shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <span aria-hidden className={cx("shrink-0 [&>svg]:size-[1.1rem]", active ? "text-royal-600" : "text-white/55 group-hover:text-gold-400")}>
                        {it.icon}
                      </span>
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.badge ? <span className="rounded-full bg-gold-500 px-1.5 text-[0.65rem] font-bold text-navy-900">{it.badge > 99 ? "99+" : it.badge}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <form action={logout} className="border-t border-white/10 p-3">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[0.86rem] font-semibold text-white/75 hover:bg-white/10 hover:text-white">
          <LogOut className="size-[1.1rem]" aria-hidden />
          Logout
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh bg-surface">
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 bg-navy-800 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[17rem] max-w-[85%] bg-navy-800 shadow-lift">{sidebar}</aside>
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute left-[min(17rem,85%)] top-3 ml-2 grid size-10 place-items-center rounded-xl bg-white text-navy-800">
            <X className="size-5" />
          </button>
        </div>
      )}
      <div className="lg:pl-64 print:pl-0">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
          <button type="button" className="grid size-10 place-items-center rounded-xl ring-1 ring-line lg:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </button>
          {searchable ? (
            <form
              role="search"
              className="relative hidden max-w-md flex-1 sm:block"
              onSubmit={(e) => {
                e.preventDefault();
                if (q.trim().length >= 2) router.push(`${root}/search?q=${encodeURIComponent(q.trim())}`);
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search students, courses, programmes…"
                aria-label="Global search"
                className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm focus:border-royal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-royal-100"
              />
            </form>
          ) : (
            <div className="flex-1" />
          )}
          <div className="ml-auto flex items-center gap-2">
            <Link href={`${root}/notifications`} className="relative grid size-10 place-items-center rounded-xl text-navy-800 ring-1 ring-line hover:bg-surface" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
              <Bell className="size-5" />
              {unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-danger-600 px-1 text-[0.65rem] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
            </Link>
            <Link href={root === "/student" ? "/student/profile" : `${root}/security`} className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-3 ring-1 ring-line hover:bg-surface">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="size-8 rounded-lg object-cover" />
              ) : (
                <span className="grid size-8 place-items-center rounded-lg bg-navy-800 text-xs font-bold text-gold-400">
                  {user.name
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")}
                </span>
              )}
              <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-navy-800 sm:block">{user.name}</span>
            </Link>
          </div>
        </header>
        {banner}
        <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
