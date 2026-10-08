import { desc, eq, sql } from "drizzle-orm";
import { Card, CardHeader, EmptyState, PageHeader, Stat, StatusBadge, Table, Td, Th } from "@/components/ui/primitives";
import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { Confirm } from "@/components/admin/row-actions";
import { can } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { createInvoiceAction, recordPaymentAction, voidInvoiceAction } from "../ops-actions";

export default async function FinanceAdmin() {
  const sess = await requireStaffPage("finance.view");
  const db = getDb();
  const manage = can(sess.actor, "finance.manage");
  const invoices = await db.select({ i: s.invoices, first: s.users.firstName, last: s.users.lastName, paid: sql<number>`coalesce((select sum(amount) from payments p where p.invoice_id = ${s.invoices.id} and p.status = 'CONFIRMED'),0)::float` }).from(s.invoices).innerJoin(s.users, eq(s.users.id, s.invoices.userId)).orderBy(desc(s.invoices.createdAt)).limit(200);
  const people = manage ? await db.select({ id: s.users.id, f: s.users.firstName, l: s.users.lastName, t: s.users.userType }).from(s.users).where(sql`${s.users.userType} in ('STUDENT','APPLICANT','ALUMNI')`).orderBy(s.users.lastName).limit(500) : [];
  const total = invoices.reduce((a, x) => a + (["VOID", "WAIVED"].includes(x.i.status) ? 0 : x.i.amount), 0);
  const received = invoices.reduce((a, x) => a + x.paid, 0);
  return (
    <>
      <PageHeader title="Finance" description="Invoices, payments and receipts. The Finance Officer has no access to grades or academic records." />
      <div className="grid gap-4 sm:grid-cols-3"><Stat label="Invoiced" value={total.toLocaleString()} /><Stat label="Received" value={received.toLocaleString()} tone="green" /><Stat label="Outstanding" value={(total - received).toLocaleString()} tone="red" /></div>
      <Card className="mt-6">
        <CardHeader title="Invoices" />
        {invoices.length === 0 ? <EmptyState title="No invoices yet." /> : (
          <Table><thead><tr><Th>Number</Th><Th>Payer</Th><Th>Description</Th><Th>Amount</Th><Th>Paid</Th><Th>Status</Th><Th /></tr></thead><tbody>
            {invoices.map(({ i, first, last, paid }) => (
              <tr key={i.id}><Td className="font-mono text-xs">{i.number}</Td><Td>{last} {first}</Td><Td className="text-xs">{i.description}</Td><Td>{i.currency} {i.amount.toLocaleString()}</Td><Td>{paid.toLocaleString()}</Td><Td><StatusBadge status={i.status} /></Td>
                <Td>{manage && ["UNPAID", "PARTIAL"].includes(i.status) && (<div className="space-y-2"><ActionForm action={recordPaymentAction} className="flex gap-1" showInlineError={false} resetOnSuccess><input type="hidden" name="invoiceId" value={i.id} /><input name="amount" type="number" step="0.01" min="0" placeholder="Amount" aria-label="Amount" className="w-24 rounded-lg border border-line px-2 py-1 text-xs" required /><select name="method" aria-label="Method" className="rounded-lg border border-line px-1 py-1 text-xs"><option value="BANK_TRANSFER">Transfer</option><option value="CASH">Cash</option><option value="POS">POS</option><option value="CARD">Card</option><option value="OTHER">Other</option></select><input name="reference" placeholder="Reference" aria-label="Reference" className="w-28 rounded-lg border border-line px-2 py-1 text-xs" /><button className="rounded-lg bg-surface px-2 py-1 text-xs font-semibold ring-1 ring-line">Record</button></ActionForm><Confirm label="Waive / void" title="Void this invoice?" reason variant="danger-outline" run={async ({ reason }) => { "use server"; return voidInvoiceAction(i.id, reason, false); }} /></div>)}</Td></tr>
            ))}
          </tbody></Table>
        )}
      </Card>
      {manage && (
        <Card className="mt-6"><CardHeader title="Create an invoice" />
          <ActionForm action={createInvoiceAction} className="grid gap-3 p-5 sm:grid-cols-3" resetOnSuccess>
            <SelectField label="Payer" name="userId" options={people.map((p) => ({ value: p.id, label: `${p.l} ${p.f} (${p.t.toLowerCase()})` }))} required />
            <SelectField label="Type" name="kind" options={["TUITION", "COURSE", "EXAMINATION", "CERTIFICATE", "TRANSCRIPT", "OTHER"].map((v) => ({ value: v, label: v.toLowerCase() }))} />
            <TextField label="Description" name="description" required /><TextField label="Amount" name="amount" type="number" step="0.01" required /><TextField label="Currency" name="currency" defaultValue="NGN" /><TextField label="Due date" name="dueOn" type="date" />
            <div className="sm:col-span-3"><SubmitButton size="sm">Create invoice</SubmitButton></div>
          </ActionForm>
        </Card>
      )}
    </>
  );
}
