import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { Do } from "@/components/admin/row-actions";
import { requireStaffPage } from "@/server/http";
import { listNotifications } from "@/server/services/notifications";
import { markNotificationsReadAction } from "@/app/student/actions";

export default async function AdminNotifications() {
  const s = await requireStaffPage();
  const items = await listNotifications(s.user.id);
  return (
    <>
      <PageHeader title="Notifications" actions={<Do label="Mark all as read" run={markNotificationsReadAction} />} />
      <Card>{items.length === 0 ? <EmptyState title="You are all caught up." /> : <ul className="divide-y divide-line">{items.map((n) => <li key={n.id} className="px-5 py-3 text-sm"><p className={n.readAt ? "font-medium" : "font-bold text-navy-800"}>{n.link ? <Link href={n.link} className="hover:underline">{n.title}</Link> : n.title}</p>{n.body && <p className="text-muted">{n.body}</p>}</li>)}</ul>}</Card>
    </>
  );
}
