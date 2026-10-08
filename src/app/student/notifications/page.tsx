import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { Do } from "@/components/admin/row-actions";
import { requireLearnerPage } from "@/server/http";
import { listNotifications } from "@/server/services/notifications";
import { markNotificationsReadAction } from "../actions";

export default async function NotificationsPage() {
  const s = await requireLearnerPage();
  const items = await listNotifications(s.user.id);
  return (
    <>
      <PageHeader title="Notifications" actions={<Do label="Mark all as read" run={markNotificationsReadAction} />} />
      <Card>
        {items.length === 0 ? (
          <EmptyState title="You are all caught up." />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((n) => (
              <li key={n.id} className="px-5 py-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={n.readAt ? "font-medium" : "font-bold text-navy-800"}>{n.link ? <Link href={n.link} className="hover:underline">{n.title}</Link> : n.title}</p>
                    {n.body && <p className="text-muted">{n.body}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-muted">{n.createdAt.toLocaleDateString("en-GB")}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
