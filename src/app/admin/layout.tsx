import { redirect } from "next/navigation";
import { KeyRound, BookOpen, Building2, CalendarDays, ClipboardList, FileText, GraduationCap, Image as ImageIcon, LayoutDashboard, LibraryBig, LineChart, Newspaper, ScrollText, Settings, ShieldCheck, Users, Wallet, HeartHandshake, Award, Gavel, FlaskConical, Layers } from "lucide-react";
import { AppShell, type NavGroup } from "@/components/shell/app-shell";
import { can, isStaffType, type Permission, type SuperCapability } from "@/core/permissions";
import { getBrand } from "@/server/brand";
import { getSession } from "@/server/http";
import { unreadCount } from "@/server/services/notifications";
import { logoutAction } from "../(auth)/actions";

type Item = { href: string; label: string; icon: React.ReactNode; perm?: (Permission | SuperCapability)[] };

const GROUPS: { title: string; items: Item[] }[] = [
  { title: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: <LayoutDashboard /> }, { href: "/admin/reports", label: "Reports", icon: <LineChart />, perm: ["reports.view"] }] },
  { title: "Admissions & Students", items: [
    { href: "/admin/admissions", label: "Applications", icon: <ClipboardList />, perm: ["admissions.view"] },
    { href: "/admin/students", label: "Students", icon: <GraduationCap />, perm: ["students.view"] },
    { href: "/admin/access-codes", label: "Access codes", icon: <KeyRound />, perm: ["codes.view"] },
  ] },
  { title: "Academics", items: [
    { href: "/admin/r/programmes", label: "Programmes", icon: <BookOpen />, perm: ["programmes.manage", "curriculum.approve"] },
    { href: "/admin/r/courses", label: "Courses & lessons", icon: <ScrollText />, perm: ["courses.manage"] },
    { href: "/admin/r/departments", label: "Departments", icon: <Building2 />, perm: ["programmes.manage"] },
    { href: "/admin/r/terms", label: "Academic calendar", icon: <CalendarDays />, perm: ["calendar.manage"] },
    { href: "/admin/r/sessions", label: "Academic sessions", icon: <CalendarDays />, perm: ["calendar.manage"] },
    { href: "/admin/r/events", label: "Calendar events", icon: <CalendarDays />, perm: ["calendar.manage"] },
    { href: "/admin/r/offerings", label: "Course offerings", icon: <Layers />, perm: ["offerings.manage"] },
    { href: "/admin/results", label: "Results", icon: <FileText />, perm: ["grades.review", "grades.approve", "teaching.any"] },
    { href: "/admin/graduation", label: "Graduation & credentials", icon: <Award />, perm: ["graduation.registrar", "graduation.board", "certificates.issue", "transcripts.issue"] },
    { href: "/admin/research", label: "Research", icon: <FlaskConical />, perm: ["research.manage"] },
    { href: "/admin/ministry", label: "Ministry formation", icon: <HeartHandshake />, perm: ["ministry.view", "ministry.manage"] },
  ] },
  { title: "Institution", items: [
    { href: "/admin/faculty", label: "Faculty & staff", icon: <Users />, perm: ["faculty.view", "users.view"] },
    { href: "/admin/r/campuses", label: "Campuses & centres", icon: <Building2 />, perm: ["programmes.manage"] },
    { href: "/admin/r/levels", label: "Programme levels", icon: <BookOpen />, perm: ["programmes.manage"] },
    { href: "/admin/r/library", label: "Library", icon: <LibraryBig />, perm: ["library.manage"] },
    { href: "/admin/finance", label: "Finance", icon: <Wallet />, perm: ["finance.view"] },
    { href: "/admin/integrity", label: "Integrity & appeals", icon: <Gavel />, perm: ["integrity.manage", "appeals.manage"] },
    { href: "/admin/community", label: "Community moderation", icon: <Users />, perm: ["community.moderate"] },
    { href: "/admin/policies", label: "Policies & doctrine", icon: <ShieldCheck />, perm: ["policies.manage", "policies.approve"] },
  ] },
  { title: "Website & System", items: [
    { href: "/admin/content", label: "Website content", icon: <Newspaper />, perm: ["content.manage"] },
    { href: "/admin/r/posts", label: "News, events & FAQs", icon: <Newspaper />, perm: ["content.manage"] },
    { href: "/admin/r/teachings", label: "Teachings", icon: <ScrollText />, perm: ["content.manage"] },
    { href: "/admin/r/teachingTracks", label: "Teaching tracks", icon: <Layers />, perm: ["content.manage"] },
    { href: "/admin/r/materials", label: "Study materials", icon: <LibraryBig />, perm: ["courses.manage", "content.manage"] },
    { href: "/admin/branding", label: "Logo & pictures", icon: <ImageIcon />, perm: ["media.manage", "super.settings"] },
    { href: "/admin/settings", label: "Settings", icon: <Settings />, perm: ["settings.academic", "settings.admissions", "super.settings"] },
    { href: "/admin/roles", label: "Roles & permissions", icon: <ShieldCheck />, perm: ["super.roles"] },
    { href: "/admin/audit", label: "Audit & security", icon: <ShieldCheck />, perm: ["audit.view", "super.security"] },
    { href: "/admin/security", label: "My security", icon: <ShieldCheck /> },
  ] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/backend");
  if (s.mfaPending) redirect("/backend/verify");
  if (!isStaffType(s.user.userType)) redirect(s.user.userType === "APPLICANT" ? "/apply" : "/student");
  const [brand, unread] = await Promise.all([getBrand(), unreadCount(s.user.id)]);
  const groups: NavGroup[] = GROUPS.map((g) => ({ title: g.title, items: g.items.filter((i) => !i.perm || i.perm.some((p) => can(s.actor, p))).map((i) => ({ href: i.href, label: i.label, icon: i.icon })) })).filter((g) => g.items.length);
  // Lecturers get a link to their teaching portal.
  if (can(s.actor, "teaching.own") || can(s.actor, "teaching.any")) groups.splice(1, 0, { title: "Teaching", items: [{ href: "/teach", label: "My teaching portal", icon: <GraduationCap /> }] });
  return (
    <AppShell groups={groups} root="/admin" markUrl={brand.markUrl} user={{ name: s.actor.name, email: s.actor.email }} roleLabel={s.user.userType === "SUPER_ADMIN" ? "SUPER ADMIN" : "ADMINISTRATION"} unread={unread} logout={logoutAction} searchable>
      {children}
    </AppShell>
  );
}
