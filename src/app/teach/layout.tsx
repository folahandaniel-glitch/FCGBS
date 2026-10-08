import { redirect } from "next/navigation";
import { BookOpen, HelpCircle, LayoutDashboard } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { can, isStaffType } from "@/core/permissions";
import { getBrand } from "@/server/brand";
import { getSession } from "@/server/http";
import { unreadCount } from "@/server/services/notifications";
import { logoutAction } from "../(auth)/actions";

export default async function TeachLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/backend");
  if (s.mfaPending) redirect("/backend/verify");
  if (!isStaffType(s.user.userType)) redirect("/student");
  if (!can(s.actor, "teaching.own") && !can(s.actor, "teaching.any") && !can(s.actor, "ministry.mentor") && !can(s.actor, "research.supervise")) redirect("/admin");
  const [brand, unread] = await Promise.all([getBrand(), unreadCount(s.user.id)]);
  const items = [{ href: "/teach", label: "My courses", icon: <BookOpen /> }, { href: "/teach/mentees", label: "My mentees", icon: <HelpCircle /> }, { href: "/admin", label: "Administration", icon: <LayoutDashboard /> }, { href: "/admin/security", label: "My security", icon: <HelpCircle /> }];
  return (
    <AppShell groups={[{ items }]} root="/teach" markUrl={brand.markUrl} user={{ name: s.actor.name, email: s.actor.email }} roleLabel="FACULTY" unread={unread} logout={logoutAction}>
      {children}
    </AppShell>
  );
}
