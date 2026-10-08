import { asc, eq } from "drizzle-orm";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/primitives";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { PermissionEditor } from "@/components/admin/staff-forms";
import { PERMISSIONS } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { createRoleAction } from "../ops-actions";

export default async function RolesAdmin() {
  await requireStaffPage("super.roles");
  const db = getDb();
  const roles = await db.select().from(s.roles).orderBy(asc(s.roles.groupName), asc(s.roles.name));
  const perms = await db.select().from(s.rolePermissions);
  const all = Object.entries(PERMISSIONS).map(([key, v]) => ({ key, group: v.group, description: v.description }));
  const matrix = ["students.view", "students.edit", "grades.enter", "grades.approve", "certificates.issue", "users.manage", "settings.academic"];
  void eq;
  return (
    <>
      <PageHeader title="Roles & permissions" description="Roles are bundles of granular permissions and are fully editable. Super-Admin capabilities can never be granted to a role. Every change is audited." />
      <Card className="mb-6 overflow-x-auto"><CardHeader title="Permission matrix (overview)" />
        <table className="w-full min-w-[640px] text-left text-xs"><thead><tr><th className="bg-surface px-3 py-2">Role</th>{matrix.map((m) => <th key={m} className="bg-surface px-3 py-2 font-mono">{m}</th>)}</tr></thead>
          <tbody>{roles.map((r) => { const have = new Set(perms.filter((p) => p.roleId === r.id).map((p) => p.permissionKey)); return <tr key={r.id} className="border-t border-line"><td className="px-3 py-2 font-semibold">{r.name}</td>{matrix.map((m) => <td key={m} className="px-3 py-2">{have.has(m) ? <Badge tone="green">Yes</Badge> : <span className="text-muted">—</span>}</td>)}</tr>; })}</tbody></table>
      </Card>
      {roles.map((r) => (
        <Card key={r.id} className="mb-4">
          <details><summary className="flex cursor-pointer items-center justify-between px-5 py-4"><span><strong className="text-navy-800">{r.name}</strong> <span className="text-xs text-muted">· {r.groupName}</span><span className="block text-xs text-muted">{r.description}</span></span><Badge tone="blue">{perms.filter((p) => p.roleId === r.id).length} permissions</Badge></summary>
            <div className="border-t border-line p-5"><PermissionEditor roleId={r.id} all={all} current={perms.filter((p) => p.roleId === r.id).map((p) => p.permissionKey)} /></div></details>
        </Card>
      ))}
      <Card><CardHeader title="Create a custom role" /><ActionForm action={createRoleAction} className="grid gap-3 p-5 sm:grid-cols-3" resetOnSuccess><TextField label="Key (lowercase-dashes)" name="key" required /><TextField label="Name" name="name" required /><TextField label="Description" name="description" /><div className="sm:col-span-3"><SubmitButton size="sm">Create role</SubmitButton></div></ActionForm></Card>
    </>
  );
}
