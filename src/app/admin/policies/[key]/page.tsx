import { notFound } from "next/navigation";
import { Badge, Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { ActionForm, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { Confirm } from "@/components/admin/row-actions";
import { Markdown } from "@/components/markdown";
import { can } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { policyHistory } from "@/server/services/ops";
import { publishPolicyAction, savePolicyAction } from "../../ops-actions";

export default async function PolicyEditor({ params }: { params: Promise<{ key: string }> }) {
  const sess = await requireStaffPage(["policies.manage", "policies.approve"]);
  const key = (await params).key;
  const hist = await policyHistory(key);
  if (!hist.length) notFound();
  const cur = hist.find((h) => h.isCurrent) ?? hist[0];
  const approve = can(sess.actor, "policies.approve");
  return (
    <>
      <PageHeader title={cur.title} description={`Current: version ${cur.version}`} breadcrumbs={[{ href: "/admin/policies", label: "Policies" }, { label: cur.title }]} />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card><CardHeader title="Propose a new version" description="Saved as a draft for review; it goes live only when approved." />
          <ActionForm action={savePolicyAction} className="space-y-4 p-5">
            <input type="hidden" name="key" value={key} />
            <TextField label="Title" name="title" defaultValue={cur.title} required />
            <TextAreaField label="Text (Markdown: ## headings, - bullets)" name="body" rows={18} defaultValue={cur.body} required />
            <TextField label="What changed and why" name="changeNote" required />
            <TextField label="Effective date" name="effectiveOn" type="date" />
            <SubmitButton pendingText="Saving…">Save draft for review</SubmitButton>
          </ActionForm>
        </Card>
        <Card><CardHeader title="Version history" />
          <ul className="divide-y divide-line">{hist.map((h) => (
            <li key={h.id} className="space-y-1 px-5 py-3 text-sm"><div className="flex items-center justify-between"><strong>v{h.version}</strong><span className="flex items-center gap-2">{h.isCurrent && <Badge tone="green">current</Badge>}<StatusBadge status={h.status} /></span></div><p className="text-xs text-muted">{h.changeNote} · {h.createdAt.toLocaleDateString("en-GB")}</p>
              {h.status === "REVIEW" && approve && <Confirm label="Approve & publish" title={`Publish version ${h.version}?`} description="This becomes the official text. The current version is kept in the history." variant="secondary" confirmVariant="primary" run={async () => { "use server"; return publishPolicyAction(h.id); }} />}
              <details><summary className="cursor-pointer text-xs font-semibold text-royal-700">View text</summary><Markdown source={h.body} className="mt-2 text-sm" /></details></li>
          ))}</ul></Card>
      </div>
    </>
  );
}
