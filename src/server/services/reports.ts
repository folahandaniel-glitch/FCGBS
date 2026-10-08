import { sql } from "drizzle-orm";
import { getDb } from "../db";

export interface Report { key: string; title: string; description: string; perm: "reports.view" | "qa.manage"; columns: string[]; query: () => Promise<Record<string, unknown>[]> }

const run = async (q: ReturnType<typeof sql>) => (await getDb().execute(q)).rows as Record<string, unknown>[];

/** Institutional reports (spec §62, §101). Aggregates only — no student contact data — and every export is rate-limited and audited. */
export const REPORTS: Report[] = [
  { key: "admissions", title: "Admission report", description: "Applications by programme and status; acceptance rate.", perm: "reports.view", columns: ["programme", "submitted", "accepted", "rejected", "waitlisted", "registered", "acceptance_rate_pct"],
    query: () => run(sql`select p.name as programme, count(*) filter (where a.status <> 'DRAFT')::int as submitted, count(*) filter (where a.status in ('ACCEPTED','CONDITIONALLY_ACCEPTED'))::int as accepted, count(*) filter (where a.status = 'REJECTED')::int as rejected, count(*) filter (where a.status = 'WAITLISTED')::int as waitlisted, count(*) filter (where a.registered_at is not null)::int as registered, round(100.0 * count(*) filter (where a.status in ('ACCEPTED','CONDITIONALLY_ACCEPTED')) / nullif(count(*) filter (where a.status <> 'DRAFT'),0), 1)::float as acceptance_rate_pct from programmes p left join applications a on a.programme_id = p.id group by p.name, p.sort order by p.sort`) },
  { key: "enrolment", title: "Enrolment report", description: "Active and completed enrolments by programme.", perm: "reports.view", columns: ["programme", "active", "completed", "withdrawn"],
    query: () => run(sql`select p.name as programme, count(*) filter (where e.status='ACTIVE')::int as active, count(*) filter (where e.status='COMPLETED')::int as completed, count(*) filter (where e.status in ('WITHDRAWN','TRANSFERRED'))::int as withdrawn from programmes p left join enrolments e on e.programme_id = p.id group by p.name, p.sort order by p.sort`) },
  { key: "course-performance", title: "Course performance report", description: "Published results: average, pass and failure rates by course.", perm: "reports.view", columns: ["code", "title", "results", "avg_total", "pass_rate_pct", "fail_rate_pct"],
    query: () => run(sql`select c.code, c.title, count(r.id)::int as results, round(avg(r.total)::numeric,1)::float as avg_total, round(100.0*count(*) filter (where r.passed)/nullif(count(r.id),0),1)::float as pass_rate_pct, round(100.0*count(*) filter (where not r.passed)/nullif(count(r.id),0),1)::float as fail_rate_pct from results r join course_registrations cr on cr.id = r.registration_id join courses c on c.id = cr.course_id where r.status in ('PUBLISHED','LOCKED') group by c.code, c.title order by c.code`) },
  { key: "result-approval", title: "Result approval report", description: "Results by workflow status.", perm: "reports.view", columns: ["status", "count"],
    query: () => run(sql`select status::text as status, count(*)::int as count from results group by status order by status`) },
  { key: "standing", title: "Academic standing report", description: "Students by academic standing.", perm: "reports.view", columns: ["standing", "count"],
    query: () => run(sql`select standing::text as standing, count(*)::int as count from students group by standing order by standing`) },
  { key: "ministry", title: "Ministry practicum report", description: "Verified and pending practicum hours by activity type.", perm: "reports.view", columns: ["kind", "activities", "verified_hours", "pending_hours"],
    query: () => run(sql`select kind, count(*)::int as activities, coalesce(sum(hours) filter (where status='VERIFIED'),0)::float as verified_hours, coalesce(sum(hours) filter (where status='SUBMITTED'),0)::float as pending_hours from ministry_activities group by kind order by kind`) },
  { key: "research", title: "Research report", description: "Research projects by status.", perm: "reports.view", columns: ["status", "count"],
    query: () => run(sql`select status, count(*)::int as count from research_projects group by status order by status`) },
  { key: "graduation", title: "Graduation & certificate report", description: "Graduation pipeline and certificates by status.", perm: "reports.view", columns: ["item", "status", "count"],
    query: () => run(sql`select 'graduation' as item, status::text as status, count(*)::int as count from graduations group by status union all select 'certificate', status::text, count(*)::int from certificates group by status order by 1,2`) },
  { key: "faculty-teaching", title: "Faculty teaching report", description: "Offerings and assessment activity per lecturer.", perm: "reports.view", columns: ["lecturer", "offerings", "assessments"],
    query: () => run(sql`select coalesce(u.first_name || ' ' || u.last_name, 'Unassigned') as lecturer, count(distinct o.id)::int as offerings, count(a.id)::int as assessments from offerings o left join users u on u.id = o.lecturer_id left join assessments a on a.offering_id = o.id group by 1 order by 1`) },
  { key: "course-evaluations", title: "Course evaluation summary", description: "Average student rating per course (anonymised).", perm: "qa.manage", columns: ["code", "title", "responses", "avg_rating"],
    query: () => run(sql`select c.code, c.title, count(e.id)::int as responses, round(avg(e.rating)::numeric,2)::float as avg_rating from evaluations e join offerings o on o.id = e.offering_id join courses c on c.id = o.course_id where e.kind='COURSE' group by c.code, c.title order by avg_rating desc`) },
  { key: "kpi", title: "Institutional KPI report", description: "Headline numbers for the Academic Board.", perm: "reports.view", columns: ["indicator", "value"],
    query: () => run(sql`select 'Applications submitted' as indicator, count(*)::float as value from applications where status <> 'DRAFT' union all select 'Active students', count(*)::float from students where status='ACTIVE' union all select 'Graduates', count(*)::float from students where status='GRADUATED' union all select 'Published results', count(*)::float from results where status in ('PUBLISHED','LOCKED') union all select 'Certificates issued (valid)', count(*)::float from certificates where status='VALID' union all select 'Verified practicum hours', coalesce(sum(hours),0)::float from ministry_activities where status='VERIFIED' union all select 'Open integrity cases', count(*)::float from integrity_cases where status in ('REPORTED','INVESTIGATING','APPEALED')`) },
];

/** CSV with formula-injection protection (cells starting with = + - @ are prefixed) so exports are safe to open in Excel. */
export function toCsv(columns: string[], rows: Record<string, unknown>[]) {
  const esc = (v: unknown) => {
    let t = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => esc(r[c])).join(","))].join("\n");
}
