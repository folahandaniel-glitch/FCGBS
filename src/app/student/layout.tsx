import { BookOpen, Award, Bell, ClipboardCheck, Cpu, FlaskConical, GraduationCap, HeartHandshake, Home, Landmark, LibraryBig, Sprout, UserRound, FileText, MessagesSquare } from "lucide-react";
import { AppShell, type NavGroup } from "@/components/shell/app-shell";
import { getBrand } from "@/server/brand";
import { requireLearnerPage } from "@/server/http";
import { unreadCount } from "@/server/services/notifications";
import { logoutAction } from "../(auth)/actions";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  // Password-change and security pages must stay reachable while a change is forced, so the layout allows them.
  const s = await requireLearnerPage({ allowPasswordChange: true });
  const [brand, unread] = await Promise.all([getBrand(), unreadCount(s.user.id)]);
  const f = brand.flags;
  const groups: NavGroup[] = [
    { title: "Learn", items: [
      { href: "/student", label: "Dashboard", icon: <Home /> },
      { href: "/student/courses", label: "My courses", icon: <BookOpen /> },
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
    { title: "Account", items: [{ href: "/student/profile", label: "Profile", icon: <UserRound /> }, { href: "/student/security", label: "Security", icon: <FileText /> }] },
  ];
  return (
    <AppShell groups={groups} root="/student" markUrl={brand.markUrl} user={{ name: `${s.user.firstName} ${s.user.lastName}`, email: s.user.email }} roleLabel={s.user.userType === "ALUMNI" ? "ALUMNI" : "STUDENT"} unread={unread} logout={logoutAction}>
      {children}
    </AppShell>
  );
}

export const _icons = GraduationCap;
