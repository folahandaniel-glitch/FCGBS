import Link from "next/link";
import { KeyRound, BookText, ScrollText, BookOpen, Award, Bell, ClipboardCheck, Cpu, FlaskConical, GraduationCap, HeartHandshake, Home, Landmark, LibraryBig, Sprout, UserRound, FileText, MessagesSquare } from "lucide-react";
import { AppShell, type NavGroup } from "@/components/shell/app-shell";
import { getBrand } from "@/server/brand";
import { requireLearnerPage } from "@/server/http";
import { unreadCount } from "@/server/services/notifications";
import { getAccessState } from "@/server/services/access";
import { logoutAction } from "../(auth)/actions";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  // Password-change and security pages must stay reachable while a change is forced, so the layout allows them.
  const s = await requireLearnerPage({ allowPasswordChange: true });
  const [brand, unread, access] = await Promise.all([getBrand(), unreadCount(s.user.id), getAccessState(s.user.id, s.user.userType)]);
  const f = brand.flags;
  const groups: NavGroup[] = [
    { title: "Learn", items: [
      { href: "/student", label: "Dashboard", icon: <Home /> },
      { href: "/student/courses", label: "My courses", icon: <BookOpen /> },
      { href: "/student/courses/start", label: "Open courses", icon: <Award /> },
      { href: "/student/courses/explore", label: "All programmes & courses", icon: <Landmark /> },
      { href: "/bible", label: "Bible Hub", icon: <BookText /> },
      { href: "/teachings", label: "Teaching Library", icon: <ScrollText /> },
      { href: "/student/results", label: "Results & GPA", icon: <ClipboardCheck /> },
      { href: "/student/records", label: "Transcript & certificate", icon: <Award /> },
    ] },
    { title: "Formation", items: [
      { href: "/student/ministry", label: "Ministry practicum", icon: <HeartHandshake /> },
      { href: "/student/formation", label: "Spiritual formation", icon: <Sprout /> },
      ...(f.research ? [{ href: "/student/research", label: "Research", icon: <FlaskConical /> }] : []),
    ] },
    { title: "Resources", items: [
      ...(f.library ? [{ href: "/student/library", label: "Library", icon: <LibraryBig /> }] : []),
      ...(f.community ? [{ href: "/student/community", label: "Community", icon: <MessagesSquare /> }] : []),
      ...(f.techHub ? [{ href: "/student/hub/tech", label: "Technology Hub", icon: <Cpu /> }] : []),
      ...(f.kingdomHub ? [{ href: "/student/hub/kingdom", label: "Kingdom Enterprise", icon: <Landmark /> }] : []),
      { href: "/student/notifications", label: "Notifications", icon: <Bell />, badge: unread || undefined },
    ] },
    { title: "Account", items: [{ href: "/access", label: "Access code", icon: <KeyRound /> }, { href: "/student/profile", label: "Profile", icon: <UserRound /> }, { href: "/student/security", label: "Security", icon: <FileText /> }] },
  ];
  const banner = access.status !== "ACTIVE" && access.status !== "STAFF" ? (
    <div className="border-b border-amber-200 bg-gradient-to-r from-amber-50 to-gold-50 px-4 py-2.5 text-sm text-warn-600 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1">
        <KeyRound className="size-4 shrink-0" aria-hidden />
        <span className="font-semibold">{access.status === "NONE" ? "Enter your access code to unlock the Bible Hub, Teachings, courses and every learning feature." : access.message}</span>
        <Link href="/student#activate" className="font-bold underline underline-offset-2">Enter access code</Link>
      </div>
    </div>
  ) : null;
  return (
    <AppShell banner={banner} groups={groups} root="/student" markUrl={brand.markUrl} user={{ name: `${s.user.firstName} ${s.user.lastName}`, email: s.user.email }} roleLabel={s.user.userType === "ALUMNI" ? "ALUMNI" : "STUDENT"} unread={unread} logout={logoutAction}>
      {children}
    </AppShell>
  );
}

export const _icons = GraduationCap;
