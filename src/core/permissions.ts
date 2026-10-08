/**
 * Granular RBAC catalogue (spec §49, §124). Nothing here is a "role check": roles are just named bundles of
 * these permissions and are fully editable by the Super Admin. The Super Admin implicitly holds every
 * permission plus the `super.*` capabilities that can never be granted to a role.
 *
 * Scope (HOD = own department, Lecturer = assigned courses, Student = own records) is enforced in the
 * services, on top of the permission, so a permission alone never opens another person's records.
 */

export const PERMISSIONS = {
  // Access codes
  "codes.view": { group: "Access codes", description: "View access codes and learners' access periods" },
  "codes.generate": { group: "Access codes", description: "Generate access codes and give learners access" },
  "codes.manage": { group: "Access codes", description: "Suspend, revoke, restore and adjust access codes and access periods" },
  // Public website & content
  "content.manage": { group: "Website & Content", description: "Edit public pages, carousel, news, events, FAQs and announcements" },
  "content.publish": { group: "Website & Content", description: "Publish content (otherwise it stays Draft/Review)" },
  "media.manage": { group: "Website & Content", description: "Upload and replace logo, pictures and media" },
  "policies.manage": { group: "Governance", description: "Draft institutional policies and the Statement of Faith" },
  "policies.approve": { group: "Governance", description: "Approve and publish institutional policies and doctrine" },
  // People
  "users.view": { group: "People", description: "View user accounts" },
  "users.manage": { group: "People", description: "Create and edit staff accounts, reset passwords, suspend accounts" },
  "students.view": { group: "Students", description: "View student records" },
  "students.edit": { group: "Students", description: "Edit student records" },
  "students.status": { group: "Students", description: "Change academic standing, suspend, withdraw or reinstate students" },
  "faculty.view": { group: "Faculty", description: "View faculty records" },
  "faculty.manage": { group: "Faculty", description: "Manage faculty appointments, ranks and teaching assignments" },
  // Admissions
  "admissions.view": { group: "Admissions", description: "View applications" },
  "admissions.review": { group: "Admissions", description: "Review applications, verify documents, schedule interviews" },
  "admissions.decide": { group: "Admissions", description: "Approve or reject admission and issue offers" },
  "admissions.register": { group: "Admissions", description: "Register admitted applicants as students" },
  // Curriculum
  "programmes.manage": { group: "Curriculum", description: "Create and edit programmes, levels and departments" },
  "courses.manage": { group: "Curriculum", description: "Create and edit courses, prerequisites and lesson content" },
  "curriculum.approve": { group: "Curriculum", description: "Academic Board: approve programmes, curriculum and curriculum changes" },
  "calendar.manage": { group: "Curriculum", description: "Manage academic sessions, semesters and calendar" },
  "offerings.manage": { group: "Curriculum", description: "Open courses each semester and assign lecturers and timetable" },
  // Registration
  "registration.manage": { group: "Registrar", description: "Register students for courses, approve exemptions and credit transfers" },
  // Teaching (scoped to assigned courses unless held with department/all scope permissions)
  "teaching.own": { group: "Teaching", description: "Teach assigned courses: materials, assignments, attendance and grading" },
  "teaching.any": { group: "Teaching", description: "Act on any course (Dean, Registrar, Exam Officer)" },
  "questions.manage": { group: "Examinations", description: "Create and edit question bank items for courses you teach" },
  "questions.approve": { group: "Examinations", description: "Approve questions into the live bank" },
  "exams.manage": { group: "Examinations", description: "Schedule and moderate examinations" },
  // Results
  "grades.enter": { group: "Results", description: "Enter and submit grades for assigned courses" },
  "grades.review": { group: "Results", description: "Review submitted grades (HOD / Dean)" },
  "grades.approve": { group: "Results", description: "Approve and publish results (cannot approve your own submission)" },
  "grades.amend": { group: "Results", description: "Approve result amendments after publication" },
  "appeals.manage": { group: "Results", description: "Handle academic appeals" },
  // Credentials
  "transcripts.issue": { group: "Credentials", description: "Generate, approve and issue transcripts" },
  "graduation.registrar": { group: "Credentials", description: "Check graduation eligibility and recommend candidates" },
  "graduation.board": { group: "Credentials", description: "Academic Board: approve graduation lists" },
  "certificates.issue": { group: "Credentials", description: "Issue certificates to approved graduates" },
  "certificates.revoke": { group: "Credentials", description: "Revoke or supersede certificates" },
  // Ministry & research
  "ministry.view": { group: "Ministry Formation", description: "View ministry formation records" },
  "ministry.manage": { group: "Ministry Formation", description: "Manage placements, verify activities, assign mentors" },
  "ministry.mentor": { group: "Ministry Formation", description: "Mentor assigned students: read shared reflections, respond, evaluate" },
  "research.manage": { group: "Research", description: "Manage research projects and viva for all students" },
  "research.supervise": { group: "Research", description: "Supervise assigned research projects" },
  // Library & community
  "library.manage": { group: "Library", description: "Manage library resources and copyright status" },
  "community.moderate": { group: "Community", description: "Moderate discussions and review reports" },
  // Money
  "finance.view": { group: "Finance", description: "View invoices and payments" },
  "finance.manage": { group: "Finance", description: "Create invoices, record payments and issue receipts (never touches grades)" },
  // Integrity & quality
  "integrity.manage": { group: "Integrity & Quality", description: "Handle academic-integrity and disciplinary cases" },
  "qa.manage": { group: "Integrity & Quality", description: "View evaluations, KPIs and quality-assurance reports" },
  // Communication
  "comms.send": { group: "Communication", description: "Send announcements and notifications" },
  // Reporting & audit
  "reports.view": { group: "Reports & Audit", description: "View institutional reports and analytics" },
  "reports.export": { group: "Reports & Audit", description: "Export reports (CSV / print)" },
  "audit.view": { group: "Reports & Audit", description: "View audit logs and security events" },
  // Academic configuration (grading, credits, standing rules)
  "settings.academic": { group: "Configuration", description: "Configure grading scale, credits, GPA rules and graduation rules (audited)" },
  "settings.admissions": { group: "Configuration", description: "Configure admission requirements and notification templates" },
  "ai.use": { group: "Configuration", description: "Use the AI assistant for drafts (output is never official)" },
} as const;

export type Permission = keyof typeof PERMISSIONS;

/** Capabilities reserved for the Super Admin — never assignable to a role. */
export const SUPER_ONLY = ["super.roles", "super.settings", "super.security", "super.accounts", "super.system"] as const;
export type SuperCapability = (typeof SUPER_ONLY)[number];

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

type RoleDef = { key: string; name: string; group: string; description: string; permissions: Permission[] };

/** Default institutional roles (titles are editable: spec §97 "exact titles must remain configurable"). */
export const SYSTEM_ROLES: RoleDef[] = [
  {
    key: "founder",
    name: "Founder / President",
    group: "Institutional Leadership",
    description: "Visionary authority: approves doctrine and policy, sees all reports. Cannot enter or approve own grades.",
    permissions: ["content.manage", "content.publish", "media.manage", "policies.manage", "policies.approve", "users.view", "students.view", "faculty.view", "admissions.view", "curriculum.approve", "reports.view", "reports.export", "qa.manage", "audit.view", "finance.view", "ministry.view", "comms.send"],
  },
  {
    key: "chancellor",
    name: "Chancellor / Principal",
    group: "Institutional Leadership",
    description: "Chief academic officer: oversight of academics, faculty, graduation and credentials.",
    permissions: ["content.manage", "content.publish", "policies.manage", "policies.approve", "users.view", "students.view", "faculty.view", "faculty.manage", "admissions.view", "admissions.decide", "programmes.manage", "courses.manage", "curriculum.approve", "calendar.manage", "offerings.manage", "grades.review", "grades.approve", "graduation.registrar", "graduation.board", "appeals.manage", "reports.view", "reports.export", "qa.manage", "audit.view", "ministry.view", "research.manage", "comms.send", "settings.academic"],
  },
  {
    key: "board",
    name: "Academic Board Member",
    group: "Academic Administration",
    description: "Approves programmes, curriculum, policies, graduation lists and reviews appeals.",
    permissions: ["students.view", "faculty.view", "programmes.manage", "curriculum.approve", "policies.approve", "graduation.board", "appeals.manage", "reports.view", "qa.manage", "ministry.view"],
  },
  {
    key: "registrar",
    name: "Registrar",
    group: "Academic Administration",
    description: "Custodian of academic records: registration, results, transcripts, graduation checks, verification.",
    permissions: ["users.view", "students.view", "students.edit", "students.status", "faculty.view", "admissions.view", "admissions.register", "calendar.manage", "offerings.manage", "registration.manage", "teaching.any", "grades.approve", "grades.amend", "appeals.manage", "transcripts.issue", "graduation.registrar", "certificates.issue", "certificates.revoke", "ministry.view", "reports.view", "reports.export", "audit.view", "comms.send", "codes.view", "codes.generate", "codes.manage"],
  },
  {
    key: "dean",
    name: "Academic Dean",
    group: "Academic Administration",
    description: "Leads academic quality: curriculum, faculty assignments, grade review.",
    permissions: ["students.view", "faculty.view", "faculty.manage", "programmes.manage", "courses.manage", "calendar.manage", "offerings.manage", "teaching.any", "grades.review", "appeals.manage", "reports.view", "reports.export", "qa.manage", "research.manage", "ministry.view", "questions.approve", "curriculum.approve"],
  },
  {
    key: "hod",
    name: "Head of Department",
    group: "Academic Administration",
    description: "Department scope: reviews departmental results and course materials.",
    permissions: ["students.view", "faculty.view", "courses.manage", "teaching.own", "grades.review", "reports.view", "questions.approve", "research.supervise"],
  },
  {
    key: "exam-officer",
    name: "Examination Officer",
    group: "Academic Administration",
    description: "Runs examinations, moderates question banks and result processing (no grade authorship).",
    permissions: ["students.view", "teaching.any", "exams.manage", "questions.approve", "grades.approve", "integrity.manage", "reports.view"],
  },
  {
    key: "admissions-officer",
    name: "Admissions Officer",
    group: "Administration",
    description: "Reviews applications and documents; recommends decisions.",
    permissions: ["admissions.view", "admissions.review", "students.view", "comms.send", "reports.view", "settings.admissions"],
  },
  {
    key: "student-affairs",
    name: "Student Affairs Officer",
    group: "Administration",
    description: "Student welfare, standing, discipline and community moderation.",
    permissions: ["students.view", "students.edit", "students.status", "integrity.manage", "community.moderate", "ministry.view", "comms.send", "codes.view"],
  },
  {
    key: "finance",
    name: "Finance Officer",
    group: "Administration",
    description: "Invoices, payments and receipts. Has no access to grades or academic records.",
    permissions: ["finance.view", "finance.manage", "students.view", "reports.view"],
  },
  {
    key: "librarian",
    name: "Librarian",
    group: "Administration",
    description: "Curates the digital library and records copyright status of resources.",
    permissions: ["library.manage", "media.manage"],
  },
  {
    key: "communications",
    name: "Communications Officer",
    group: "Administration",
    description: "News, events, announcements and the homepage carousel.",
    permissions: ["content.manage", "content.publish", "media.manage", "comms.send"],
  },
  {
    key: "ict",
    name: "ICT / System Administrator",
    group: "Administration",
    description: "Accounts support and system health. No academic or financial authority.",
    permissions: ["users.view", "users.manage", "media.manage", "audit.view"],
  },
  {
    key: "lecturer",
    name: "Lecturer",
    group: "Faculty",
    description: "Teaches assigned courses: materials, assessments, attendance, grading and result submission.",
    permissions: ["teaching.own", "questions.manage", "grades.enter", "research.supervise", "ministry.mentor", "ai.use"],
  },
  {
    key: "adjunct",
    name: "Adjunct / Visiting Lecturer",
    group: "Faculty",
    description: "Teaches assigned courses on a limited appointment.",
    permissions: ["teaching.own", "questions.manage", "grades.enter", "ai.use"],
  },
  {
    key: "teaching-assistant",
    name: "Teaching Assistant",
    group: "Faculty",
    description: "Supports a course: attendance and marking first pass. Cannot submit results.",
    permissions: ["teaching.own"],
  },
  {
    key: "mentor",
    name: "Ministry Mentor",
    group: "Faculty",
    description: "Mentors students in ministry formation and supervises practicum.",
    permissions: ["ministry.mentor", "ministry.view"],
  },
];

export interface Principal {
  userType: "SUPER_ADMIN" | "STAFF" | "STUDENT" | "APPLICANT" | "ALUMNI";
  permissions: ReadonlySet<string>;
}

/** Accounts that work in the backend. Students, applicants and alumni never do. */
export const isStaffType = (t: string) => t === "STAFF" || t === "SUPER_ADMIN";

export function can(p: Principal | null | undefined, perm: Permission | SuperCapability): boolean {
  if (!p) return false;
  if (p.userType === "SUPER_ADMIN") return true;
  if ((SUPER_ONLY as readonly string[]).includes(perm)) return false;
  if (p.userType !== "STAFF") return false;
  return p.permissions.has(perm);
}

export const canAny = (p: Principal | null | undefined, perms: (Permission | SuperCapability)[]) => perms.some((x) => can(p, x));

/** Filters a requested permission list down to legal, assignable keys. */
export function sanitisePermissionList(keys: string[]): Permission[] {
  const legal = new Set<string>(ALL_PERMISSIONS);
  return Array.from(new Set(keys.filter((k) => legal.has(k)))) as Permission[];
}
