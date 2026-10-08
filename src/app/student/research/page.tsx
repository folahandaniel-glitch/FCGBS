import { desc, eq } from "drizzle-orm";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/primitives";
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { requireLearnerPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { learnerContext } from "@/server/services/learner";
import { researchSubmitAction, startResearchAction } from "../actions";

export default async function ResearchPage() {
  const sess = await requireLearnerPage();
  const lc = await learnerContext(sess.user.id);
  if (!lc) return <EmptyState title="No student record." />;
  const db = getDb();
  const projects = await db.select().from(s.researchProjects).where(eq(s.researchProjects.studentId, lc.student.id)).orderBy(desc(s.researchProjects.createdAt));
  const subs = await Promise.all(projects.map((p) => db.select().from(s.researchSubmissions).where(eq(s.researchSubmissions.projectId, p.id)).orderBy(desc(s.researchSubmissions.createdAt))));
  return (
    <>
      <PageHeader title="Research" description="Topic, proposal, drafts, supervisor feedback, final submission and viva for Diploma and Advanced Diploma research." />
      {projects.length === 0 && (
        <Card className="mb-6">
          <CardHeader title="Register a research topic" />
          <ActionForm action={startResearchAction} className="space-y-3 p-5"><TextField label="Topic" name="title" required /><TextAreaField label="Short abstract" name="abstract" rows={4} /><SubmitButton>Register topic</SubmitButton></ActionForm>
        </Card>
      )}
      {projects.map((p, i) => (
        <Card key={p.id} className="mb-6">
          <CardHeader title={p.title} description={p.abstract ?? undefined} action={<Badge tone="blue">{p.status.replace(/_/g, " ").toLowerCase()}</Badge>} />
          <div className="space-y-4 p-5">
            {p.grade && <p className="text-sm font-semibold">Assessment: {p.grade} ({p.score})</p>}
            <ActionForm action={researchSubmitAction} className="space-y-3 rounded-xl bg-surface p-4" resetOnSuccess>
              <input type="hidden" name="projectId" value={p.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField label="Stage" name="stage" options={[{ value: "PROPOSAL", label: "Proposal" }, { value: "LITERATURE_REVIEW", label: "Literature review" }, { value: "CHAPTER", label: "Chapter" }, { value: "DRAFT", label: "Draft" }, { value: "FINAL", label: "Final submission" }]} />
                <TextField label="Title" name="title" />
              </div>
              <TextAreaField label="Text" name="body" rows={5} />
              <label className="block text-sm font-semibold text-navy-800">Or attach a file<input type="file" name="file" accept=".pdf,.docx" className="mt-1.5 block text-sm" /></label>
              <TextField label="AI-use disclosure (if any)" name="aiDisclosure" />
              <SubmitButton size="sm">Submit</SubmitButton>
            </ActionForm>
            <ul className="divide-y divide-line">
              {(subs[i] ?? []).map((x) => (
                <li key={x.id} className="py-3 text-sm"><strong>{x.stage.replace(/_/g, " ").toLowerCase()}</strong> — {x.title} <span className="text-xs text-muted">{x.createdAt.toLocaleDateString("en-GB")}</span>{x.feedback && <p className="mt-1 rounded-lg bg-gold-50 p-3 text-xs"><strong>Supervisor feedback:</strong> {x.feedback}</p>}</li>
              ))}
            </ul>
          </div>
        </Card>
      ))}
      {projects.length === 0 && <Card><EmptyState title="No research project yet." /></Card>}
    </>
  );
}
