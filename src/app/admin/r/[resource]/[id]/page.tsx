/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Card, PageHeader } from "@/components/ui/primitives";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { Confirm } from "@/components/admin/row-actions";
import { getResource, lookupOptions, resourceFor, type Field } from "@/server/admin-resources";
import { requireStaffPage } from "@/server/http";
import { can } from "@/core/permissions";
import { deleteResourceAction, saveResourceAction } from "../../actions";

export default async function ResourceEdit({ params, searchParams }: { params: Promise<{ resource: string; id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { resource, id } = await params;
  const r = resourceFor(resource);
  if (!r) notFound();
  const sess = await requireStaffPage(r.perm);
  const isNew = id === "new";
  const row = isNew ? {} : await getResource(r, id);
  if (!row) notFound();
  const saved = (await searchParams).saved;
  const options = Object.fromEntries(await Promise.all(r.fields.filter((f) => f.lookup).map(async (f) => [f.name, await lookupOptions(f.lookup!)] as const)));
  const canApprove = !r.approvePerm || can(sess.actor, r.approvePerm);
  const val = (f: Field): string => {
    const v = (row as Record<string, unknown>)[f.name];
    if (v === null || v === undefined) return "";
    if (f.type === "lines") return (v as string[]).join("\n");
    if (f.type === "topics") return (v as { title: string; points: string[] }[]).map((t) => `${t.title} :: ${t.points.join("; ")}`).join("\n");
    if (f.type === "datetime" && v instanceof Date) return v.toISOString().slice(0, 16);
    return String(v);
  };
  return (
    <>
      <PageHeader title={isNew ? `Add ${r.singular.toLowerCase()}` : `Edit ${r.singular.toLowerCase()}`} breadcrumbs={[{ href: `/admin/r/${r.key}`, label: r.label }, { label: isNew ? "New" : String((row as Record<string, unknown>).title ?? (row as Record<string, unknown>).name ?? (row as Record<string, unknown>).code ?? "") }]}
        actions={!isNew && r.key === "courses" ? <Link href={`/admin/courses/${id}`} className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold ring-1 ring-line hover:bg-royal-50">Lessons & weights</Link> : !isNew && r.key === "programmes" ? <Link href={`/admin/programmes/${id}`} className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold ring-1 ring-line hover:bg-royal-50">Course structure</Link> : undefined} />
      {saved && <Alert tone="success" className="mb-4">Saved. The change is live and recorded in the audit log.</Alert>}
      {r.approvePerm && !canApprove && <Alert tone="info" className="mb-4">You can draft and submit for review. Only the Academic Board / publishing approver can mark this Approved or Published.</Alert>}
      <Card className="p-5">
        <ActionForm action={saveResourceAction} className="space-y-5">
          <input type="hidden" name="_key" value={r.key} />
          <input type="hidden" name="_id" value={id} />
          <div className="grid gap-4 md:grid-cols-2">
            {r.fields.map((f) => {
              const wide = f.type === "textarea" || f.type === "lines" || f.type === "topics" || f.type === "image" || f.type === "file";
              const cls = wide ? "md:col-span-2" : "";
              if (f.type === "bool") return <div key={f.name} className={cls}><CheckboxField name={f.name} label={f.label} defaultChecked={Boolean((row as Record<string, unknown>)[f.name] ?? (isNew && f.name === "active"))} hint={f.hint} /></div>;
              if (f.type === "textarea") return <TextAreaField key={f.name} name={f.name} label={f.label} className={cls} defaultValue={val(f)} rows={f.rows ?? 4} required={f.required} hint={f.hint} />;
              if (f.type === "lines") return <TextAreaField key={f.name} name={f.name} label={`${f.label} (one per line)`} className={cls} defaultValue={val(f)} rows={5} hint={f.hint} />;
              if (f.type === "topics") return <TextAreaField key={f.name} name={f.name} label="Course topics (one per line: Title :: point; point; point)" className={cls} defaultValue={val(f)} rows={6} />;
              if (f.type === "image") { const cur = val(f); return <div key={f.name} className={cls}><input type="hidden" name={f.name} value={cur} /><p className="mb-1.5 text-sm font-semibold text-navy-800">{f.label}</p>{cur && <img src={`/api/v1/assets/${cur}`} alt="" className="mb-2 h-24 rounded-lg object-cover ring-1 ring-line" />}<input type="file" name={`${f.name}__file`} accept="image/png,image/jpeg,image/webp,image/gif" aria-label={f.label} className="text-sm" /></div>; }
              if (f.type === "file") { const cur = val(f); return <div key={f.name} className={cls}><input type="hidden" name={f.name} value={cur} /><p className="mb-1.5 text-sm font-semibold text-navy-800">{f.label}</p>{cur && <p className="mb-2 text-xs"><a className="font-semibold text-royal-700 underline" href={`/api/v1/assets/${cur}`}>Current file</a> — choose a new file below to replace it.</p>}<input type="file" name={`${f.name}__file`} accept={f.accept} aria-label={f.label} className="text-sm" /></div>; }
              if (f.type === "select") {
                const opts = f.lookup ? options[f.name] : f.options ?? [];
                const def = val(f) || (isNew && f.name === "status" ? "DRAFT" : isNew && f.name === "audience" ? "PUBLIC" : isNew && f.name === "accessLevel" ? "STUDENTS" : "");
                const filtered = f.name === "status" && r.approvePerm && !canApprove ? opts.filter((o) => ["DRAFT", "REVIEW", "ARCHIVED"].includes(o.value)) : opts;
                return <SelectField key={f.name} name={f.name} label={f.label} defaultValue={def} options={filtered} placeholder={f.nullable || !f.required ? "—" : undefined} required={f.required} className={cls} />;
              }
              const type = f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : "text";
              return <TextField key={f.name} name={f.name} label={f.label} type={type} step={f.type === "number" ? "any" : undefined} defaultValue={val(f) || (isNew && f.type === "number" && !f.nullable ? "0" : "")} required={f.required} hint={f.hint} className={cls} />;
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3"><SubmitButton pendingText="Saving…">Save</SubmitButton>{!isNew && r.canDelete && <Confirm label="Delete" title={`Delete this ${r.singular.toLowerCase()}?`} description="This cannot be undone." variant="danger-outline" run={async () => { "use server"; return deleteResourceAction(r.key, id); }} />}</div>
        </ActionForm>
      </Card>
    </>
  );
}
