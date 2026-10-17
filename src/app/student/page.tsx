import Link from "next/link";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader, ProgressBar, Stat, StatusBadge } from "@/components/ui/primitives";
import { requireLearnerPage } from "@/server/http";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { enrolmentSummary } from "@/server/services/academics";
import { learnerContext, myRegistrations } from "@/server/services/learner";
import { listPosts } from "@/server/services/catalog";
import { listNotifications } from "@/server/services/notifications";
import { AccessCard } from "@/components/access/access-card";
import { accessContact } from "@/server/gate";
import { getAccessState } from "@/server/services/access";

export default async function StudentHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const sess = await requireLearnerPage();
  const lc = await learnerContext(sess.user.id);
  if (!lc?.primary) return (
    <div className="space-y-6">
      <div className="mb-2"><AccessCard initial={await getAccessState(sess.user.id, sess.user.userType)} contact={(await accessContact()).contact} note={(await accessContact()).note} /></div>
      <EmptyState title="Start here: open your courses" description="Your access code is active and opens every course. Open a programme, or open all courses and study in any order." action={<Link className="rounded-xl bg-navy-800 px-5 py-2.5 text-sm font-bold text-white" href="/student/courses/start">Open my courses</Link>} />
    </div>
  );
  const en = lc.primary;
  const [sum, regs, anns, notes] = await Promise.all([enrolmentSummary(en.e.id), myRegistrations(en.e.id), listPosts("ANNOUNCEMENT", { limit: 4, audience: ["PUBLIC", "STUDENTS"] }), listNotifications(sess.user.id, 4)]);
  const offeringIds = regs.map((r) => r.offeringId).filter(Boolean) as string[];
  const upcoming = offeringIds.length ? await getDb().select({ id: s.assessments.id, title: s.assessments.title, kind: s.assessments.kind, dueAt: s.assessments.dueAt, closesAt: s.assessments.closesAt }).from(s.assessments).where(and(inArray(s.assessments.offeringId, offeringIds), eq(s.assessments.status, "PUBLISHED"), gte(s.assessments.closesAt, new Date()))).orderBy(s.assessments.closesAt).limit(6) : [];
  const [prog] = await getDb().select({ credits: s.programmes.minCredits }).from(s.programmes).where(eq(s.programmes.id, en.e.programmeId));
  const progress = prog?.credits ? Math.min(100, (sum.creditsEarned / prog.credits) * 100) : 0;
  const recent = await getDb().select({ code: s.courses.code, title: s.courses.title, grade: s.results.grade, publishedAt: s.results.publishedAt }).from(s.results).innerJoin(s.courseRegistrations, eq(s.courseRegistrations.id, s.results.registrationId)).innerJoin(s.courses, eq(s.courses.id, s.courseRegistrations.courseId)).where(and(eq(s.courseRegistrations.enrolmentId, en.e.id), inArray(s.results.status, ["PUBLISHED", "LOCKED"]))).orderBy(desc(s.results.publishedAt)).limit(4);
  const sp = await searchParams;
  const [access, contact] = await Promise.all([getAccessState(sess.user.id, sess.user.userType), accessContact()]);
  return (
    <>
      <PageHeader eyebrow={`${en.level} · ${lc.student.studentNumber}`} title={`Welcome, ${sess.user.firstName}`} description={`${en.programme}${lc.term ? ` · ${lc.term.name}` : ""}`} actions={<StatusBadge status={sum.standing} />} />
      <div className="mb-6"><AccessCard initial={access} contact={contact.contact} note={contact.note} /></div>
      {sp.welcome && <Alert tone="success" className="mb-4">Welcome to FCGBS! Start by registering for your courses.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="CGPA" value={sum.records.some((r) => r.graded) ? sum.cgpa.toFixed(2) : "—"} tone="gold" hint={sum.classification ?? "No published results yet"} />
        <Stat label="Credits earned" value={`${sum.creditsEarned}${prog?.credits ? ` / ${prog.credits}` : ""}`} />
        <Stat label="Current courses" value={regs.filter((r) => !r.resultStatus || r.resultStatus === "DRAFT" || r.resultStatus === "SUBMITTED").length} tone="navy" />
        <Stat label="Standing" value={sum.standing.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} tone="green" />
      </div>
      <Card className="mt-6 p-5"><p className="mb-2 text-sm font-bold text-navy-800">Programme progress</p><ProgressBar value={progress} tone="gold" label="Programme progress" /><p className="mt-1 text-xs text-muted">{Math.round(progress)}% of credit units earned</p></Card>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="My courses" action={<Link href="/student/courses" className="text-sm font-semibold text-royal-700 hover:underline">Manage</Link>} />
          {regs.length === 0 ? <EmptyState title="No courses registered yet." description="Register for this semester's courses to begin." action={<Link className="font-semibold text-royal-700 underline" href="/student/courses">Register now</Link>} /> : (
            <ul className="divide-y divide-line">{regs.slice(0, 6).map((r) => <li key={r.regId} className="flex items-center justify-between px-5 py-3 text-sm">{r.offeringId ? <Link href={`/student/courses/${r.offeringId}`} className="font-semibold text-navy-800 hover:underline">{r.code} · {r.title}</Link> : <span>{r.code} · {r.title}</span>}<Badge tone="blue">{r.credits} cr</Badge></li>)}</ul>
          )}
        </Card>
        <Card><CardHeader title="Upcoming assignments & examinations" />
          {upcoming.length === 0 ? <EmptyState title="No assignments have been published." /> : <ul className="divide-y divide-line">{upcoming.map((a) => <li key={a.id} className="flex items-center justify-between px-5 py-3 text-sm"><Link href={`/student/assessments/${a.id}`} className="font-semibold text-navy-800 hover:underline">{a.title}</Link><span className="text-xs text-muted">{a.kind.toLowerCase()} · {(a.dueAt ?? a.closesAt)?.toLocaleDateString("en-GB")}</span></li>)}</ul>}
        </Card>
        <Card><CardHeader title="Recent results" action={<Link href="/student/results" className="text-sm font-semibold text-royal-700 hover:underline">All results</Link>} />
          {recent.length === 0 ? <EmptyState title="No examination results are available." /> : <ul className="divide-y divide-line">{recent.map((r) => <li key={r.code} className="flex justify-between px-5 py-3 text-sm"><span>{r.code} · {r.title}</span><Badge tone="green">{r.grade}</Badge></li>)}</ul>}
        </Card>
        <Card><CardHeader title="Announcements & notifications" />
          <ul className="divide-y divide-line">{anns.map((a) => <li key={a.id} className="px-5 py-3 text-sm"><Link href={`/news/${a.slug}`} className="font-semibold text-navy-800 hover:underline">{a.title}</Link></li>)}{notes.map((n) => <li key={n.id} className="px-5 py-3 text-sm"><p className="font-medium">{n.title}</p></li>)}{anns.length + notes.length === 0 && <li className="p-5 text-sm text-muted">Nothing new.</li>}</ul>
        </Card>
      </div>
    </>
  );
}
