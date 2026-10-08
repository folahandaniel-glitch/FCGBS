import Link from "next/link";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/primitives";
import { ActionForm, SubmitButton, TextAreaField } from "@/components/ui/form";
import { Confirm } from "@/components/admin/row-actions";
import { requireLearnerPage } from "@/server/http";
import { getBrand } from "@/server/brand";
import { notFound } from "next/navigation";
import { listPosts, type Scope } from "@/server/services/community";
import { learnerContext, myRegistrations } from "@/server/services/learner";
import { blockAction, postAction, reportAction } from "../community-actions";

const SPACES: { scope: Scope; label: string }[] = [{ scope: "STUDENT", label: "Student community" }, { scope: "MINISTRY", label: "Ministry discussions" }];

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ scope?: string; course?: string }> }) {
  const sess = await requireLearnerPage();
  if (!(await getBrand()).flags.community) notFound();
  const sp = await searchParams;
  const lc = await learnerContext(sess.user.id);
  const regs = lc?.primary ? (await myRegistrations(lc.primary.e.id)).filter((r) => r.offeringId && r.source === "REGISTERED") : [];
  const courseId = sp.course && regs.some((r) => r.courseId === sp.course) ? sp.course : undefined;
  const scope: Scope = courseId ? "COURSE" : sp.scope === "MINISTRY" ? "MINISTRY" : "STUDENT";
  const posts = await listPosts(sess.actor, scope, courseId);
  const roots = posts.filter((p) => !p.parentId);
  return (
    <>
      <PageHeader title="Community" description="Respectful, Christ-honouring discussion. Posts are plain text and can be reported; moderators review reports." />
      <div className="mb-4 flex flex-wrap gap-2">
        {SPACES.map((x) => <Link key={x.scope} href={`/student/community?scope=${x.scope}`} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!courseId && scope === x.scope ? "bg-navy-800 text-white" : "bg-white ring-1 ring-line hover:bg-royal-50"}`}>{x.label}</Link>)}
        {regs.map((r) => <Link key={r.courseId} href={`/student/community?course=${r.courseId}`} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${courseId === r.courseId ? "bg-navy-800 text-white" : "bg-white ring-1 ring-line hover:bg-royal-50"}`}>{r.code}</Link>)}
      </div>
      <Card className="mb-5"><CardHeader title="Start a discussion" />
        <ActionForm action={postAction} className="space-y-3 p-5" resetOnSuccess><input type="hidden" name="scope" value={scope} /><input type="hidden" name="courseId" value={courseId ?? ""} /><TextAreaField label="Message" name="body" rows={3} required /><SubmitButton size="sm">Post</SubmitButton></ActionForm></Card>
      <Card>
        {roots.length === 0 ? <EmptyState title="No discussions yet. Be the first to start one." /> : (
          <ul className="divide-y divide-line">
            {roots.map((p) => (
              <li key={p.id} className="space-y-2 px-5 py-4 text-sm">
                <p className="text-xs font-semibold text-gold-600">{p.first} {p.last} · {p.createdAt.toLocaleString("en-GB")}</p>
                <p className="whitespace-pre-wrap">{p.body}</p>
                <ul className="space-y-1 border-l-2 border-line pl-3">{posts.filter((r) => r.parentId === p.id).reverse().map((r) => <li key={r.id} className="text-xs"><strong>{r.first} {r.last}:</strong> {r.body}</li>)}</ul>
                <ActionForm action={postAction} className="flex gap-2" showInlineError={false} resetOnSuccess><input type="hidden" name="scope" value={scope} /><input type="hidden" name="courseId" value={courseId ?? ""} /><input type="hidden" name="parentId" value={p.id} /><input name="body" placeholder="Reply…" aria-label="Reply" className="block w-full rounded-xl border border-line px-3 py-1.5 text-xs" /><SubmitButton size="sm" variant="secondary">Reply</SubmitButton></ActionForm>
                {p.userId !== sess.user.id && <div className="flex gap-2"><Confirm label="Report" title="Report this post" reason variant="secondary" run={async ({ reason }) => { "use server"; return reportAction(p.id, reason); }} /><Confirm label="Block author" title="Block this person?" description="You will no longer see their posts." variant="secondary" run={async () => { "use server"; return blockAction(p.userId); }} /></div>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
