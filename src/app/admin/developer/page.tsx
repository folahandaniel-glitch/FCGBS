import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardHeader, PageHeader, Stat, StatusBadge, Table, Td, Th } from "@/components/ui/primitives";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { requireStaffPage } from "@/server/http";
import { isDeveloper, listPlatformAccounts, systemInfo } from "@/server/services/developer";
import { AccountActions, CreateAccountForm } from "./controls";

const TOOLS = [
  ["/admin/books", "Books & purchase codes"], ["/admin/roles", "Roles & permissions"], ["/admin/settings", "Settings"], ["/admin/audit", "Audit & security log"], ["/admin/content", "Website content"],
  ["/admin/branding", "Logo & pictures"], ["/admin/upload-centre", "Upload centre"], ["/admin/access-codes", "Access codes"], ["/admin/faculty", "Faculty & staff"],
] as const;

export default async function DeveloperPage() {
  const sess = await requireStaffPage("super.accounts");
  if (!(await isDeveloper(sess.user.id))) notFound();
  const [accounts, info, roles] = await Promise.all([listPlatformAccounts(), systemInfo(sess.actor), getDb().select({ key: s.roles.key, name: s.roles.name }).from(s.roles)]);
  return (
    <>
      <PageHeader eyebrow="Developer" title="Developer console" description="You are the platform owner. Add Super Admins and Admins, manage their access, and check the health of the system. Nobody else can change your account." />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Object.entries(info.counts).map(([k, v], i) => <Stat key={k} label={k} value={v} tone={(["royal", "green", "gold", "red", "navy", "royal"] as const)[i % 6]} />)}
      </div>

      <Card className="mt-6">
        <CardHeader title="Add a Super Admin or Admin" description="A temporary password is shown once." />
        <div className="p-5"><CreateAccountForm roles={roles} /></div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Administrator accounts" />
        <Table>
          <thead><tr><Th>Name</Th><Th>Level</Th><Th>Status</Th><Th>2FA</Th><Th>Last sign-in</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {accounts.map((u) => (
              <tr key={u.id}>
                <Td>{u.first} {u.last}<span className="block text-xs text-muted">{u.email}</span></Td>
                <Td>{u.dev ? <Badge tone="navy">Developer</Badge> : u.type === "SUPER_ADMIN" ? <Badge tone="gold">Super Admin</Badge> : <><Badge tone="blue">Admin</Badge><span className="block text-xs text-muted">{u.roles.join(", ") || "no roles yet"}</span></>}</Td>
                <Td><StatusBadge status={u.status} /></Td>
                <Td>{u.totp ? <Badge tone="green">on</Badge> : <Badge>off</Badge>}</Td>
                <Td className="whitespace-nowrap text-xs">{u.lastLogin ? u.lastLogin.toISOString().slice(0, 16).replace("T", " ") : "never"}</Td>
                <Td>{u.dev ? <Link href="/admin/security" className="text-sm font-bold text-royal-700 underline">My security</Link> : <AccountActions userId={u.id} name={`${u.first} ${u.last}`} type={u.type} status={u.status} />}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="System" description={`Version ${info.version} · ${info.environment}`} />
          <ul className="space-y-2 p-5 text-sm">
            {info.env.map((e) => <li key={e.name} className="flex justify-between gap-3"><code>{e.name}</code><Badge tone={e.set ? "green" : "neutral"}>{e.set ? "set" : "not set"}</Badge></li>)}
          </ul>
          {info.env.find((e) => e.name === "SETUP_TOKEN")?.set && <p className="px-5 pb-5 text-sm text-warn-600">Your account already exists, so SETUP_TOKEN is no longer needed. Remove it in Vercel → Settings → Environment Variables.</p>}
        </Card>
        <Card>
          <CardHeader title="Everything else you control" />
          <ul className="grid gap-2 p-5 sm:grid-cols-2">{TOOLS.map(([href, label]) => <li key={href}><Link href={href} className="block rounded-xl bg-gradient-to-r from-royal-100 to-violet-100 px-3 py-2.5 text-sm font-bold text-navy-800 hover:from-royal-100 hover:to-amber-100">{label}</Link></li>)}</ul>
        </Card>
      </div>
    </>
  );
}
