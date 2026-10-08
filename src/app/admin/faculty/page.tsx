import { Badge, Card, CardHeader, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui/primitives";
import { Confirm } from "@/components/admin/row-actions";
import { CreateStaffForm, ResetLink, RoleChooser } from "@/components/admin/staff-forms";
import { can } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { listStaff } from "@/server/services/people";
import { accountStatusAction } from "../ops-actions";

export default async function FacultyAdmin() {
  const sess = await requireStaffPage(["faculty.view", "users.view"]);
  const staff = await listStaff();
  const manage = can(sess.actor, "users.manage");
  const roleAdmin = can(sess.actor, "super.roles");
  const roles = await getDb().select({ key: s.roles.key, name: s.roles.name }).from(s.roles);
  const depts = (await getDb().select({ id: s.departments.id, name: s.departments.name }).from(s.departments)).map((d) => ({ value: d.id, label: d.name }));
  return (
    <>
      <PageHeader title="Faculty & staff" description="Staff accounts, appointments and roles. Only the Super Admin can assign roles; account creation shows a one-time temporary password." />
      <Card>
        <Table><thead><tr><Th>Name</Th><Th>Appointment</Th><Th>Roles</Th><Th>Status</Th><Th>2FA</Th><Th /></tr></thead><tbody>
          {staff.map((u) => (
            <tr key={u.id}><Td>{u.title} {u.first} {u.last}<span className="block text-xs text-muted">{u.email}</span></Td><Td className="text-xs">{u.dept ?? "—"}</Td>
              <Td className="min-w-64 text-xs">{u.type === "SUPER_ADMIN" ? <Badge tone="gold">Super Admin</Badge> : roleAdmin ? <RoleChooser userId={u.id} roles={roles} current={u.roles.map((r) => r.key)} /> : u.roles.map((r) => <Badge key={r.key} tone="blue" className="mr-1">{r.name}</Badge>)}</Td>
              <Td><StatusBadge status={u.status} /></Td><Td>{u.totp ? <Badge tone="green">on</Badge> : <Badge>off</Badge>}</Td>
              <Td className="space-y-1">{manage && u.type !== "SUPER_ADMIN" && <><ResetLink userId={u.id} />{u.status === "ACTIVE" ? <Confirm label="Suspend" title="Suspend this account?" reason variant="danger-outline" run={async ({ reason }) => { "use server"; return accountStatusAction(u.id, "SUSPENDED", reason); }} /> : <Confirm label="Reactivate" title="Reactivate this account?" reason confirmVariant="primary" run={async ({ reason }) => { "use server"; return accountStatusAction(u.id, "ACTIVE", reason); }} />}</>}</Td></tr>
          ))}
        </tbody></Table>
      </Card>
      {manage && <Card className="mt-6"><CardHeader title="Add a staff account" description="Lecturers, officers and administrators. Faculty profiles can be shown on the public Faculty page." /><div className="p-5"><CreateStaffForm roles={roles} departments={depts} canAssignRoles={roleAdmin} /></div></Card>}
    </>
  );
}
