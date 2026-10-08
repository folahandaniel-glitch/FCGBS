/**
 * Grading and GPA arithmetic (spec §17–20). Pure functions: no database, no framework, so they are unit
 * tested and reusable by a future mobile app. The server is the only place results are *calculated*;
 * the client may only display what the server returns.
 */

export interface GradeBand {
  min: number;
  max: number;
  grade: string;
  point: number;
  label?: string;
}

/** Default scale from the institutional specification — configurable by authorised academic administrators. */
export const DEFAULT_GRADING_SCALE: GradeBand[] = [
  { min: 90, max: 100, grade: "A+", point: 4.0, label: "Outstanding" },
  { min: 85, max: 89, grade: "A", point: 4.0, label: "Excellent" },
  { min: 80, max: 84, grade: "A-", point: 3.7, label: "Very good" },
  { min: 75, max: 79, grade: "B+", point: 3.3, label: "Good" },
  { min: 70, max: 74, grade: "B", point: 3.0, label: "Good" },
  { min: 65, max: 69, grade: "B-", point: 2.7, label: "Satisfactory" },
  { min: 60, max: 64, grade: "C+", point: 2.3, label: "Satisfactory" },
  { min: 55, max: 59, grade: "C", point: 2.0, label: "Adequate" },
  { min: 50, max: 54, grade: "C-", point: 1.7, label: "Adequate" },
  { min: 45, max: 49, grade: "D", point: 1.0, label: "Marginal pass" },
  { min: 0, max: 44, grade: "F", point: 0.0, label: "Fail" },
];

/** Returns an error message if the scale is unusable, otherwise null. Bands must cover 0–100 without gaps or overlaps. */
export function validateGradingScale(scale: GradeBand[]): string | null {
  if (scale.length < 2) return "A grading scale needs at least two bands.";
  const sorted = [...scale].sort((a, b) => a.min - b.min);
  if (sorted[0].min !== 0) return "The lowest band must start at 0.";
  if (sorted[sorted.length - 1].max !== 100) return "The highest band must end at 100.";
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    if (b.max < b.min) return `Band ${b.grade}: the maximum is below the minimum.`;
    if (b.point < 0 || b.point > 5) return `Band ${b.grade}: grade point must be between 0 and 5.`;
    if (i > 0 && b.min !== sorted[i - 1].max + 1) return `Bands must be contiguous: ${sorted[i - 1].grade} ends at ${sorted[i - 1].max} but ${b.grade} starts at ${b.min}.`;
  }
  if (new Set(scale.map((b) => b.grade)).size !== scale.length) return "Each grade letter may appear only once.";
  return null;
}

/** Rounds to the nearest whole mark (the scale is in whole numbers) — the single place rounding happens. */
export function roundMark(total: number): number {
  return Math.round(total + Number.EPSILON);
}

export function gradeFor(total: number, scale: GradeBand[] = DEFAULT_GRADING_SCALE): GradeBand {
  const t = Math.min(100, Math.max(0, roundMark(total)));
  return scale.find((b) => t >= b.min && t <= b.max) ?? scale[scale.length - 1];
}

export interface Weights {
  assignment: number;
  test: number;
  exam: number;
  practical: number;
}
export interface Components {
  assignment: number | null;
  test: number | null;
  exam: number | null;
  practical: number | null;
}

/**
 * Weighted course total. Each component is a percentage (0–100) of its own maximum; a weight of 0 means
 * the component is not used. A missing component that carries weight counts as 0 — it is never "forgiven".
 */
export function courseTotal(components: Components, weights: Weights): number {
  const keys = ["assignment", "test", "exam", "practical"] as const;
  const sumW = keys.reduce((a, k) => a + weights[k], 0);
  if (sumW <= 0) return 0;
  const raw = keys.reduce((a, k) => a + ((components[k] ?? 0) / 100) * weights[k], 0);
  return Math.round((raw / sumW) * 100 * 100) / 100;
}

export interface CourseRecord {
  courseId: string;
  credits: number;
  point: number;
  grade: string;
  passed: boolean;
  /** Counted toward GPA (credit transfers and exemptions give credit without a grade point). */
  graded: boolean;
}

export type RepeatPolicy = "LATEST" | "HIGHEST" | "ALL";

/** Applies the repeat policy so a repeated course is counted once (or every time, if the institution chooses). */
export function applyRepeatPolicy<T extends CourseRecord & { order: number }>(records: T[], policy: RepeatPolicy): T[] {
  if (policy === "ALL") return records;
  const by = new Map<string, T>();
  for (const r of records) {
    const cur = by.get(r.courseId);
    if (!cur) by.set(r.courseId, r);
    else if (policy === "LATEST" ? r.order >= cur.order : r.point > cur.point || (r.point === cur.point && r.order > cur.order)) by.set(r.courseId, r);
  }
  return [...by.values()];
}

export function gpa(records: Pick<CourseRecord, "credits" | "point" | "graded">[]): { gpa: number; credits: number; qualityPoints: number } {
  const graded = records.filter((r) => r.graded && r.credits > 0);
  const credits = graded.reduce((a, r) => a + r.credits, 0);
  const qp = graded.reduce((a, r) => a + r.credits * r.point, 0);
  return { gpa: credits ? Math.round((qp / credits) * 100) / 100 : 0, credits, qualityPoints: Math.round(qp * 100) / 100 };
}

/** Credits earned = credits of passed courses (graded passes plus transfers/exemptions). */
export function creditsEarned(records: Pick<CourseRecord, "credits" | "passed">[]): number {
  return records.filter((r) => r.passed).reduce((a, r) => a + r.credits, 0);
}

export interface StandingRules {
  warningBelow: number;
  probationBelow: number;
  suspensionBelow: number;
  /** Standing is not judged until this many graded credits exist (one early result should not trigger probation). */
  minCreditsForJudgement: number;
}

export type Standing = "GOOD_STANDING" | "ACADEMIC_WARNING" | "ACADEMIC_PROBATION" | "SUSPENDED";

export function standingFor(cgpa: number, gradedCredits: number, rules: StandingRules): Standing {
  if (gradedCredits < rules.minCreditsForJudgement) return "GOOD_STANDING";
  if (cgpa < rules.suspensionBelow) return "SUSPENDED";
  if (cgpa < rules.probationBelow) return "ACADEMIC_PROBATION";
  if (cgpa < rules.warningBelow) return "ACADEMIC_WARNING";
  return "GOOD_STANDING";
}

export interface ClassificationBand {
  minCgpa: number;
  label: string;
}

export function classificationFor(cgpa: number, bands: ClassificationBand[]): string | null {
  const sorted = [...bands].sort((a, b) => b.minCgpa - a.minCgpa);
  return sorted.find((b) => cgpa >= b.minCgpa)?.label ?? null;
}

/* ---------------------------------------------------------- graduation eligibility */

export interface GraduationInput {
  requiredCourseIds: string[];
  passedCourseIds: string[];
  creditsEarned: number;
  minCredits: number;
  cgpa: number;
  minCgpa: number;
  outstandingAssessments: number;
  practicumHoursVerified: number;
  practicumHoursRequired: number;
  researchRequired: boolean;
  researchApproved: boolean;
  outstandingFees: number;
  openDisciplinaryCases: number;
}

export interface GraduationCheck {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

/** Every requirement is evaluated and explained; "eligible" means all pass (the Registrar and Board still decide). */
export function graduationEligibility(i: GraduationInput): { eligible: boolean; checks: GraduationCheck[] } {
  const missing = i.requiredCourseIds.filter((c) => !i.passedCourseIds.includes(c));
  const checks: GraduationCheck[] = [
    { key: "courses", label: "Required courses completed", ok: missing.length === 0, detail: missing.length ? `${missing.length} required course(s) outstanding` : "All required courses passed" },
    { key: "credits", label: "Minimum credits", ok: i.creditsEarned >= i.minCredits, detail: `${i.creditsEarned} of ${i.minCredits} credits earned` },
    { key: "cgpa", label: "Minimum CGPA", ok: i.cgpa >= i.minCgpa, detail: `CGPA ${i.cgpa.toFixed(2)} (minimum ${i.minCgpa.toFixed(2)})` },
    { key: "assessments", label: "No outstanding assessments", ok: i.outstandingAssessments === 0, detail: i.outstandingAssessments ? `${i.outstandingAssessments} result(s) not yet published` : "All results published" },
    { key: "practicum", label: "Ministry practicum hours", ok: i.practicumHoursVerified >= i.practicumHoursRequired, detail: `${i.practicumHoursVerified} of ${i.practicumHoursRequired} verified hours` },
    { key: "research", label: "Research / capstone", ok: !i.researchRequired || i.researchApproved, detail: !i.researchRequired ? "Not required for this programme" : i.researchApproved ? "Approved" : "Not yet approved" },
    { key: "clearance", label: "Financial / administrative clearance", ok: i.outstandingFees <= 0, detail: i.outstandingFees > 0 ? `Outstanding balance ${i.outstandingFees.toLocaleString()}` : "Cleared" },
    { key: "discipline", label: "Disciplinary status", ok: i.openDisciplinaryCases === 0, detail: i.openDisciplinaryCases ? `${i.openDisciplinaryCases} open case(s)` : "No open cases" },
  ];
  return { eligible: checks.every((c) => c.ok), checks };
}
