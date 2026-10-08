/**
 * FCGBS — PostgreSQL schema (Drizzle ORM).
 *
 * Design notes
 * - Identity (users) is separate from academic facts: a student has an identity row, one or more
 *   enrolments (programme-level), course registrations (course-level) and results (per registration).
 *   Nothing academic is stored on the student row, so changing programme, repeating a course, transferring
 *   credits or continuing to a higher level needs no redesign (spec §75).
 * - `campus_id` is optional on the tables that matter, so multi-campus / learning centres can be added later.
 * - Official records (results, transcripts, certificates) are append-only in spirit: corrections create
 *   amendment rows, and the audit log is append-only (a trigger in the migration rejects UPDATE/DELETE).
 * - All timestamps are timestamptz (UTC); time zones are applied at display time.
 */
import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () => ts("updated_at").notNull().defaultNow();
const id = () => uuid("id").primaryKey().defaultRandom();
const num = (name: string, p = 6, s = 2) => numeric(name, { precision: p, scale: s, mode: "number" });

/* ------------------------------------------------------------------ enums */

export const userTypeEnum = pgEnum("user_type", ["SUPER_ADMIN", "STAFF", "STUDENT", "APPLICANT", "ALUMNI"]);
export const accountStatusEnum = pgEnum("account_status", ["ACTIVE", "SUSPENDED", "PENDING"]);
export const contentStatusEnum = pgEnum("content_status", ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"]);
export const applicationStatusEnum = pgEnum("application_status", [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "INTERVIEW_REQUIRED",
  "ACCEPTED",
  "CONDITIONALLY_ACCEPTED",
  "WAITLISTED",
  "REJECTED",
  "WITHDRAWN",
]);
export const studentStatusEnum = pgEnum("student_status", ["ACTIVE", "ON_LEAVE", "SUSPENDED", "WITHDRAWN", "GRADUATED"]);
export const standingEnum = pgEnum("academic_standing", [
  "GOOD_STANDING",
  "ACADEMIC_WARNING",
  "ACADEMIC_PROBATION",
  "SUSPENDED",
  "WITHDRAWN",
  "GRADUATING",
  "GRADUATED",
]);
export const enrolmentStatusEnum = pgEnum("enrolment_status", ["ACTIVE", "COMPLETED", "WITHDRAWN", "TRANSFERRED", "DEFERRED"]);
export const registrationStatusEnum = pgEnum("registration_status", ["PENDING", "APPROVED", "DROPPED", "COMPLETED", "WITHDRAWN"]);
export const registrationSourceEnum = pgEnum("registration_source", ["REGISTERED", "EXEMPTION", "TRANSFER"]);
export const resultStatusEnum = pgEnum("result_status", ["DRAFT", "SUBMITTED", "REVIEWED", "APPROVED", "PUBLISHED", "LOCKED"]);
export const assessmentKindEnum = pgEnum("assessment_kind", ["ASSIGNMENT", "TEST", "QUIZ", "EXAM", "PRACTICAL"]);
export const assessmentStatusEnum = pgEnum("assessment_status", ["DRAFT", "PUBLISHED", "CLOSED"]);
export const questionTypeEnum = pgEnum("question_type", ["MCQ", "TRUE_FALSE", "MULTI", "SHORT", "ESSAY", "MATCHING"]);
export const transcriptStatusEnum = pgEnum("transcript_status", ["DRAFT", "APPROVED", "ISSUED", "REVOKED"]);
export const certificateStatusEnum = pgEnum("certificate_status", ["PENDING", "VALID", "REVOKED", "SUPERSEDED"]);
export const graduationStatusEnum = pgEnum("graduation_status", [
  "ELIGIBLE",
  "REGISTRAR_APPROVED",
  "BOARD_APPROVED",
  "GRADUATED",
  "CERTIFICATE_ISSUED",
  "DEFERRED",
  "REJECTED",
]);

/* ---------------------------------------------------------- identity & security */

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    userType: userTypeEnum("user_type").notNull(),
    status: accountStatusEnum("status").notNull().default("ACTIVE"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    otherNames: text("other_names"),
    phone: text("phone"),
    country: text("country"),
    timezone: text("timezone"),
    avatarAssetId: uuid("avatar_asset_id"),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    totpEnabled: boolean("totp_enabled").notNull().default(false),
    totpSecretEnc: text("totp_secret_enc"),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: ts("locked_until"),
    lastLoginAt: ts("last_login_at"),
    passwordChangedAt: ts("password_changed_at"),
    deletedAt: ts("deleted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(sql`lower(${t.email})`), index("users_type_idx").on(t.userType)],
);

export const recoveryCodes = pgTable("recovery_codes", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  usedAt: ts("used_at"),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    tokenHash: text("token_hash").notNull(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    mfaPending: boolean("mfa_pending").notNull().default(false),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
    revokedAt: ts("revoked_at"),
    revokedReason: text("revoked_reason"),
  },
  (t) => [uniqueIndex("sessions_token_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdBy: uuid("created_by"),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: createdAt(),
});

export const roles = pgTable("roles", {
  id: id(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  groupName: text("group_name").notNull().default("Custom"),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: createdAt(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
    permissionKey: text("permission_key").notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionKey] })],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
    assignedBy: uuid("assigned_by"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: ts("window_start").notNull().defaultNow(),
  count: integer("count").notNull().default(0),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorId: uuid("actor_id"),
    actorType: text("actor_type").notNull().default("SYSTEM"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    summary: text("summary"),
    /** previous / new values, reason, approver — whatever the action needs to answer "who, what, when, why". */
    metadata: jsonb("metadata"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt), index("audit_entity_idx").on(t.entityType, t.entityId), index("audit_actor_idx").on(t.actorId)],
);

export const securityEvents = pgTable(
  "security_events",
  {
    id: id(),
    type: text("type").notNull(),
    severity: text("severity").notNull().default("LOW"),
    userId: uuid("user_id"),
    detail: jsonb("detail"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    resolvedAt: ts("resolved_at"),
    resolvedBy: uuid("resolved_by"),
    createdAt: createdAt(),
  },
  (t) => [index("secev_created_idx").on(t.createdAt)],
);

/* ------------------------------------------------------- configuration & content */

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by"),
  updatedAt: updatedAt(),
});

export const contentBlocks = pgTable("content_blocks", {
  id: id(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  version: integer("version").notNull().default(1),
  updatedBy: uuid("updated_by"),
  updatedAt: updatedAt(),
});

export const contentVersions = pgTable(
  "content_versions",
  {
    id: id(),
    blockId: uuid("block_id").notNull().references(() => contentBlocks.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    value: jsonb("value").notNull(),
    updatedBy: uuid("updated_by"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("content_versions_uq").on(t.blockId, t.version)],
);

export const assets = pgTable(
  "assets",
  {
    id: id(),
    kind: text("kind").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    sha256: text("sha256").notNull(),
    data: bytea("data").notNull(),
    alt: text("alt"),
    /** Public assets (logo, site pictures) are served to anyone; the rest need an authorised session. */
    isPublic: boolean("is_public").notNull().default(false),
    /** Who may read a private asset besides staff: the owner and (optionally) anyone linked to `scopeRef`. */
    ownerId: uuid("owner_id"),
    scopeRef: text("scope_ref"),
    uploadedBy: uuid("uploaded_by"),
    createdAt: createdAt(),
  },
  (t) => [index("assets_kind_idx").on(t.kind)],
);

export const posts = pgTable(
  "posts",
  {
    id: id(),
    kind: text("kind").notNull(), // NEWS | EVENT | ANNOUNCEMENT | FAQ | ARTICLE
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary"),
    body: text("body"),
    imageAssetId: uuid("image_asset_id"),
    startsAt: ts("starts_at"),
    endsAt: ts("ends_at"),
    location: text("location"),
    audience: text("audience").notNull().default("PUBLIC"), // PUBLIC | STUDENTS | FACULTY | ALUMNI | STAFF
    status: contentStatusEnum("status").notNull().default("DRAFT"),
    pinned: boolean("pinned").notNull().default(false),
    showInCarousel: boolean("show_in_carousel").notNull().default(false),
    linkUrl: text("link_url"),
    linkLabel: text("link_label"),
    sort: integer("sort").notNull().default(0),
    publishedAt: ts("published_at"),
    authorId: uuid("author_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("posts_kind_slug_uq").on(t.kind, t.slug), index("posts_status_idx").on(t.kind, t.status, t.publishedAt)],
);

export const policies = pgTable(
  "policies",
  {
    id: id(),
    key: text("key").notNull(),
    title: text("title").notNull(),
    version: integer("version").notNull().default(1),
    status: contentStatusEnum("status").notNull().default("DRAFT"),
    effectiveOn: date("effective_on"),
    body: text("body").notNull(),
    changeNote: text("change_note"),
    authorId: uuid("author_id"),
    approvedBy: uuid("approved_by"),
    approvedAt: ts("approved_at"),
    previousId: uuid("previous_id"),
    isCurrent: boolean("is_current").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("policies_key_version_uq").on(t.key, t.version), index("policies_current_idx").on(t.key, t.isCurrent)],
);

/* ------------------------------------------------------------ institution structure */

export const campuses = pgTable("campuses", {
  id: id(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  address: text("address"),
  country: text("country"),
  timezone: text("timezone"),
  isOnline: boolean("is_online").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const departments = pgTable("departments", {
  id: id(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  hodUserId: uuid("hod_user_id").references(() => users.id, { onDelete: "set null" }),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const staffProfiles = pgTable("staff_profiles", {
  id: id(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
  title: text("title"), // Dr., Rev., Pastor, Apostle …
  rank: text("rank"), // Senior Faculty, Lecturer, Adjunct …
  appointmentType: text("appointment_type"),
  employedOn: date("employed_on"),
  specialization: text("specialization"),
  qualifications: jsonb("qualifications").$type<string[]>().notNull().default([]),
  ministryExperience: text("ministry_experience"),
  researchInterests: text("research_interests"),
  bio: text("bio"),
  publicProfile: boolean("public_profile").notNull().default(false),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------- programmes */

export const programmeLevels = pgTable("programme_levels", {
  id: id(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  rank: integer("rank").notNull(),
  description: text("description"),
});

export const programmes = pgTable(
  "programmes",
  {
    id: id(),
    code: text("code").notNull().unique(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    levelId: uuid("level_id").notNull().references(() => programmeLevels.id),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    description: text("description"),
    objectives: jsonb("objectives").$type<string[]>().notNull().default([]),
    learningOutcomes: jsonb("learning_outcomes").$type<string[]>().notNull().default([]),
    admissionRequirements: jsonb("admission_requirements").$type<string[]>().notNull().default([]),
    graduationRequirements: jsonb("graduation_requirements").$type<string[]>().notNull().default([]),
    practicalRequirements: text("practical_requirements"),
    assessmentRequirements: text("assessment_requirements"),
    /** Honest recognition wording (spec §94–95). Defaults to an institutional programme; never auto-claims accreditation. */
    recognitionNote: text("recognition_note"),
    durationMonths: integer("duration_months").notNull().default(12),
    minCredits: integer("min_credits").notNull().default(0),
    minCgpa: num("min_cgpa", 3, 2).notNull().default(1.5),
    practicumHours: integer("practicum_hours").notNull().default(0),
    researchRequired: boolean("research_required").notNull().default(false),
    tuitionFee: num("tuition_fee", 12, 2).notNull().default(0),
    currency: text("currency").notNull().default("NGN"),
    status: contentStatusEnum("status").notNull().default("DRAFT"),
    version: integer("version").notNull().default(1),
    sort: integer("sort").notNull().default(0),
    approvedBy: uuid("approved_by"),
    approvedAt: ts("approved_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("programmes_level_idx").on(t.levelId)],
);

export const courses = pgTable(
  "courses",
  {
    id: id(),
    code: text("code").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    levelRank: integer("level_rank").notNull().default(1),
    credits: integer("credits").notNull().default(2),
    contactHours: integer("contact_hours").notNull().default(30),
    category: text("category").notNull().default("GENERAL"),
    objectives: jsonb("objectives").$type<string[]>().notNull().default([]),
    outcomes: jsonb("outcomes").$type<string[]>().notNull().default([]),
    topics: jsonb("topics").$type<{ title: string; points: string[] }[]>().notNull().default([]),
    readings: jsonb("readings").$type<string[]>().notNull().default([]),
    practicalRequirements: text("practical_requirements"),
    ministryRequirements: text("ministry_requirements"),
    attendanceMinPct: integer("attendance_min_pct").notNull().default(70),
    /** Component weights in percent; must total 100 (validated server-side). */
    assessmentWeights: jsonb("assessment_weights").$type<{ assignment: number; test: number; exam: number; practical: number }>().notNull().default({ assignment: 20, test: 20, exam: 60, practical: 0 }),
    status: contentStatusEnum("status").notNull().default("DRAFT"),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("courses_dept_idx").on(t.departmentId), index("courses_status_idx").on(t.status)],
);

export const programmeCourses = pgTable(
  "programme_courses",
  {
    programmeId: uuid("programme_id").notNull().references(() => programmes.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("CORE"), // CORE | ELECTIVE
    year: integer("year").notNull().default(1),
    semester: integer("semester").notNull().default(1),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.programmeId, t.courseId] })],
);

export const courseRelations = pgTable(
  "course_relations",
  {
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    relatedCourseId: uuid("related_course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // PREREQUISITE | COREQUISITE
  },
  (t) => [primaryKey({ columns: [t.courseId, t.relatedCourseId, t.kind] })],
);

/* ------------------------------------------------------------------ calendar */

export const academicSessions = pgTable("academic_sessions", {
  id: id(),
  name: text("name").notNull().unique(),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on").notNull(),
  admissionDeadline: date("admission_deadline"),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: createdAt(),
});

export const academicTerms = pgTable(
  "academic_terms",
  {
    id: id(),
    sessionId: uuid("session_id").notNull().references(() => academicSessions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ordinal: integer("ordinal").notNull().default(1),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    registrationOpens: date("registration_opens"),
    registrationCloses: date("registration_closes"),
    examsStart: date("exams_start"),
    examsEnd: date("exams_end"),
    isCurrent: boolean("is_current").notNull().default(false),
  },
  (t) => [uniqueIndex("terms_session_ord_uq").on(t.sessionId, t.ordinal)],
);

export const academicEvents = pgTable("academic_events", {
  id: id(),
  sessionId: uuid("session_id").references(() => academicSessions.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // ORIENTATION | HOLIDAY | BREAK | GRADUATION | ADMISSION_DEADLINE | EXAM_PERIOD | OTHER
  title: text("title").notNull(),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on"),
  notes: text("notes"),
});

export const offerings = pgTable(
  "offerings",
  {
    id: id(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "restrict" }),
    termId: uuid("term_id").notNull().references(() => academicTerms.id, { onDelete: "restrict" }),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    lecturerId: uuid("lecturer_id").references(() => users.id, { onDelete: "set null" }),
    capacity: integer("capacity"),
    schedule: jsonb("schedule").$type<{ day: string; start: string; end: string; venue: string }[]>().notNull().default([]),
    meetingUrl: text("meeting_url"),
    status: text("status").notNull().default("OPEN"), // OPEN | CLOSED
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("offerings_course_term_uq").on(t.courseId, t.termId), index("offerings_lecturer_idx").on(t.lecturerId)],
);

export const offeringStaff = pgTable(
  "offering_staff",
  {
    offeringId: uuid("offering_id").notNull().references(() => offerings.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("TEACHING_ASSISTANT"),
  },
  (t) => [primaryKey({ columns: [t.offeringId, t.userId] })],
);

/* ------------------------------------------------------------------ admissions */

export const applications = pgTable(
  "applications",
  {
    id: id(),
    applicationNo: text("application_no").notNull().unique(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    programmeId: uuid("programme_id").notNull().references(() => programmes.id),
    sessionId: uuid("session_id").references(() => academicSessions.id),
    campusId: uuid("campus_id").references(() => campuses.id),
    status: applicationStatusEnum("status").notNull().default("DRAFT"),
    personal: jsonb("personal").$type<Record<string, string>>().notNull().default({}),
    education: jsonb("education").$type<{ level?: string; institution?: string; year?: string; qualification?: string; notes?: string }[]>().notNull().default([]),
    ministryBackground: jsonb("ministry_background").$type<Record<string, string>>().notNull().default({}),
    references: jsonb("references_list").$type<{ name: string; relationship: string; email: string; phone: string }[]>().notNull().default([]),
    statement: text("statement"),
    submittedAt: ts("submitted_at"),
    reviewedBy: uuid("reviewed_by"),
    reviewNotes: text("review_notes"),
    interviewAt: ts("interview_at"),
    decisionBy: uuid("decision_by"),
    decisionAt: ts("decision_at"),
    decisionNote: text("decision_note"),
    conditions: text("conditions"),
    offerAcceptedAt: ts("offer_accepted_at"),
    registeredAt: ts("registered_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("applications_user_idx").on(t.userId), index("applications_status_idx").on(t.status)],
);

export const applicationDocuments = pgTable("application_documents", {
  id: id(),
  applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // IDENTIFICATION | CERTIFICATE | REFERENCE | PHOTO | OTHER
  assetId: uuid("asset_id").notNull().references(() => assets.id),
  verified: boolean("verified").notNull().default(false),
  verifiedBy: uuid("verified_by"),
  note: text("note"),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ students */

export const students = pgTable(
  "students",
  {
    id: id(),
    userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    studentNumber: text("student_number").notNull().unique(),
    dateOfBirth: date("date_of_birth"),
    gender: text("gender"),
    address: text("address"),
    nationality: text("nationality"),
    emergencyContact: jsonb("emergency_contact").$type<{ name?: string; relationship?: string; phone?: string }>().notNull().default({}),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    admissionSessionId: uuid("admission_session_id").references(() => academicSessions.id),
    status: studentStatusEnum("status").notNull().default("ACTIVE"),
    standing: standingEnum("standing").notNull().default("GOOD_STANDING"),
    createdAt: createdAt(),
  },
  (t) => [index("students_status_idx").on(t.status)],
);

export const alumniProfiles = pgTable("alumni_profiles", {
  id: id(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  graduationYear: integer("graduation_year"),
  ministry: text("ministry"),
  location: text("location"),
  bio: text("bio"),
  publicProfile: boolean("public_profile").notNull().default(false),
  updatedAt: updatedAt(),
});

export const enrolments = pgTable(
  "enrolments",
  {
    id: id(),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    programmeId: uuid("programme_id").notNull().references(() => programmes.id),
    startSessionId: uuid("start_session_id").references(() => academicSessions.id),
    status: enrolmentStatusEnum("status").notNull().default("ACTIVE"),
    standing: standingEnum("standing").notNull().default("GOOD_STANDING"),
    startedOn: date("started_on").notNull().default(sql`current_date`),
    completedOn: date("completed_on"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("enrolments_student_programme_uq").on(t.studentId, t.programmeId), index("enrolments_programme_idx").on(t.programmeId)],
);

export const courseRegistrations = pgTable(
  "course_registrations",
  {
    id: id(),
    enrolmentId: uuid("enrolment_id").notNull().references(() => enrolments.id, { onDelete: "cascade" }),
    offeringId: uuid("offering_id").references(() => offerings.id, { onDelete: "restrict" }),
    courseId: uuid("course_id").notNull().references(() => courses.id),
    status: registrationStatusEnum("status").notNull().default("APPROVED"),
    source: registrationSourceEnum("source").notNull().default("REGISTERED"),
    isRepeat: boolean("is_repeat").notNull().default(false),
    approvedBy: uuid("approved_by"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("registrations_enrol_offering_uq").on(t.enrolmentId, t.offeringId), index("registrations_course_idx").on(t.courseId), index("registrations_offering_idx").on(t.offeringId)],
);

/* ------------------------------------------------------------------ attendance */

export const attendanceSessions = pgTable("attendance_sessions", {
  id: id(),
  offeringId: uuid("offering_id").notNull().references(() => offerings.id, { onDelete: "cascade" }),
  heldOn: date("held_on").notNull(),
  kind: text("kind").notNull().default("LECTURE"), // LECTURE | EXAMINATION | PRACTICUM | OTHER
  topic: text("topic"),
  takenBy: uuid("taken_by"),
  createdAt: createdAt(),
});

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    sessionId: uuid("session_id").notNull().references(() => attendanceSessions.id, { onDelete: "cascade" }),
    registrationId: uuid("registration_id").notNull().references(() => courseRegistrations.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("PRESENT"), // PRESENT | ABSENT | EXCUSED | LATE
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.registrationId] })],
);

/* ---------------------------------------------------------------- learning (LMS) */

export const modules = pgTable(
  "modules",
  {
    id: id(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary"),
    position: integer("position").notNull().default(0),
    status: contentStatusEnum("status").notNull().default("PUBLISHED"),
  },
  (t) => [index("modules_course_idx").on(t.courseId, t.position)],
);

export const lessons = pgTable(
  "lessons",
  {
    id: id(),
    moduleId: uuid("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary"),
    body: text("body"),
    videoUrl: text("video_url"),
    audioUrl: text("audio_url"),
    assetId: uuid("asset_id"),
    readMinutes: integer("read_minutes").notNull().default(8),
    position: integer("position").notNull().default(0),
    /** Content authority (spec §79): institutional doctrine > approved academic > lecturer material. */
    authority: text("authority").notNull().default("ACADEMIC"), // INSTITUTIONAL | ACADEMIC | LECTURER
    status: contentStatusEnum("status").notNull().default("PUBLISHED"),
    authorId: uuid("author_id"),
    approvedBy: uuid("approved_by"),
    updatedAt: updatedAt(),
  },
  (t) => [index("lessons_module_idx").on(t.moduleId, t.position), index("lessons_course_idx").on(t.courseId)],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    completedAt: ts("completed_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

export const discussionPosts = pgTable(
  "discussion_posts",
  {
    id: id(),
    scope: text("scope").notNull(), // COURSE | STUDENT | FACULTY | MINISTRY
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    body: text("body").notNull(),
    status: text("status").notNull().default("VISIBLE"), // VISIBLE | HIDDEN | REMOVED
    createdAt: createdAt(),
  },
  (t) => [index("discussion_scope_idx").on(t.scope, t.courseId, t.createdAt)],
);

export const discussionReports = pgTable("discussion_reports", {
  id: id(),
  postId: uuid("post_id").notNull().references(() => discussionPosts.id, { onDelete: "cascade" }),
  reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("OPEN"), // OPEN | ACTIONED | DISMISSED
  resolvedBy: uuid("resolved_by"),
  createdAt: createdAt(),
});

export const userBlocks = pgTable(
  "user_blocks",
  {
    blockerId: uuid("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })],
);

/* ------------------------------------------------------ assessments & examinations */

export const questions = pgTable(
  "questions",
  {
    id: id(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    type: questionTypeEnum("type").notNull(),
    stem: text("stem").notNull(),
    /** MCQ/MULTI/TRUE_FALSE: [{id,text}] · MATCHING: [{id,left,right}] */
    options: jsonb("options").$type<Record<string, string>[]>().notNull().default([]),
    /** MCQ/TRUE_FALSE: option id · MULTI: ids[] · MATCHING: {leftId: rightId} · SHORT: accepted answers[] · ESSAY: rubric text */
    answer: jsonb("answer").$type<unknown>(),
    marks: num("marks", 5, 1).notNull().default(1),
    difficulty: text("difficulty").notNull().default("MEDIUM"),
    explanation: text("explanation"),
    status: text("status").notNull().default("DRAFT"), // DRAFT | PENDING | APPROVED | ARCHIVED
    authorId: uuid("author_id"),
    reviewedBy: uuid("reviewed_by"),
    createdAt: createdAt(),
  },
  (t) => [index("questions_course_idx").on(t.courseId, t.status)],
);

export const assessments = pgTable(
  "assessments",
  {
    id: id(),
    offeringId: uuid("offering_id").notNull().references(() => offerings.id, { onDelete: "cascade" }),
    kind: assessmentKindEnum("kind").notNull(),
    title: text("title").notNull(),
    instructions: text("instructions"),
    maxScore: num("max_score", 6, 1).notNull().default(100),
    opensAt: ts("opens_at"),
    dueAt: ts("due_at"),
    closesAt: ts("closes_at"),
    timeLimitMin: integer("time_limit_min"),
    maxAttempts: integer("max_attempts").notNull().default(1),
    shuffle: boolean("shuffle").notNull().default(true),
    /** Exam questions: number drawn at random from the approved bank (question pool) or an explicit list. */
    pool: jsonb("pool").$type<{ drawCount?: number; questionIds?: string[] }>().notNull().default({}),
    lateAllowed: boolean("late_allowed").notNull().default(false),
    latePenaltyPct: integer("late_penalty_pct").notNull().default(10),
    resubmission: boolean("resubmission").notNull().default(false),
    /** AI policy indicator shown to students: PROHIBITED | DISCLOSE | ALLOWED. */
    aiPolicy: text("ai_policy").notNull().default("DISCLOSE"),
    status: assessmentStatusEnum("status").notNull().default("DRAFT"),
    createdBy: uuid("created_by"),
    createdAt: createdAt(),
  },
  (t) => [index("assessments_offering_idx").on(t.offeringId, t.kind)],
);

export const submissions = pgTable(
  "submissions",
  {
    id: id(),
    assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
    registrationId: uuid("registration_id").notNull().references(() => courseRegistrations.id, { onDelete: "cascade" }),
    text: text("text"),
    assetId: uuid("asset_id"),
    aiUsed: boolean("ai_used").notNull().default(false),
    aiDisclosure: text("ai_disclosure"),
    submittedAt: ts("submitted_at").notNull().defaultNow(),
    isLate: boolean("is_late").notNull().default(false),
    revision: integer("revision").notNull().default(1),
    status: text("status").notNull().default("SUBMITTED"), // SUBMITTED | GRADED | RETURNED
    score: num("score", 6, 1),
    feedback: text("feedback"),
    gradedBy: uuid("graded_by"),
    gradedAt: ts("graded_at"),
  },
  (t) => [uniqueIndex("submissions_uq").on(t.assessmentId, t.registrationId)],
);

export const examAttempts = pgTable(
  "exam_attempts",
  {
    id: id(),
    assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
    registrationId: uuid("registration_id").notNull().references(() => courseRegistrations.id, { onDelete: "cascade" }),
    attemptNo: integer("attempt_no").notNull().default(1),
    startedAt: ts("started_at").notNull().defaultNow(),
    deadlineAt: ts("deadline_at").notNull(),
    submittedAt: ts("submitted_at"),
    status: text("status").notNull().default("IN_PROGRESS"), // IN_PROGRESS | SUBMITTED | GRADED
    /** Immutable snapshot of the questions as shown (shuffled) — later edits never change history. */
    snapshot: jsonb("snapshot").$type<{ id: string; type: string; stem: string; options: Record<string, string>[]; marks: number }[]>().notNull().default([]),
    answers: jsonb("answers").$type<Record<string, unknown>>().notNull().default({}),
    autoScore: num("auto_score", 6, 1),
    manualScores: jsonb("manual_scores").$type<Record<string, number>>().notNull().default({}),
    finalScore: num("final_score", 6, 1),
    events: jsonb("events").$type<{ t: string; at: string }[]>().notNull().default([]),
    ip: text("ip"),
    gradedBy: uuid("graded_by"),
  },
  (t) => [uniqueIndex("attempts_uq").on(t.assessmentId, t.registrationId, t.attemptNo)],
);

/* ------------------------------------------------------------------- results */

export const results = pgTable(
  "results",
  {
    id: id(),
    registrationId: uuid("registration_id").notNull().unique().references(() => courseRegistrations.id, { onDelete: "restrict" }),
    components: jsonb("components").$type<{ assignment: number | null; test: number | null; exam: number | null; practical: number | null }>().notNull().default({ assignment: null, test: null, exam: null, practical: null }),
    total: num("total", 5, 2),
    grade: text("grade"),
    gradePoint: num("grade_point", 3, 2),
    credits: integer("credits").notNull().default(0),
    passed: boolean("passed"),
    status: resultStatusEnum("status").notNull().default("DRAFT"),
    remarks: text("remarks"),
    submittedBy: uuid("submitted_by"),
    submittedAt: ts("submitted_at"),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: ts("reviewed_at"),
    approvedBy: uuid("approved_by"),
    approvedAt: ts("approved_at"),
    publishedBy: uuid("published_by"),
    publishedAt: ts("published_at"),
    lockedAt: ts("locked_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("results_status_idx").on(t.status)],
);

export const resultAmendments = pgTable("result_amendments", {
  id: id(),
  resultId: uuid("result_id").notNull().references(() => results.id, { onDelete: "restrict" }),
  oldTotal: num("old_total", 5, 2),
  oldGrade: text("old_grade"),
  newTotal: num("new_total", 5, 2).notNull(),
  newGrade: text("new_grade").notNull(),
  newGradePoint: num("new_grade_point", 3, 2).notNull(),
  reason: text("reason").notNull(),
  requestedBy: uuid("requested_by").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING | APPROVED | REJECTED
  decidedBy: uuid("decided_by"),
  decisionNote: text("decision_note"),
  decidedAt: ts("decided_at"),
  createdAt: createdAt(),
});

export const academicAppeals = pgTable("academic_appeals", {
  id: id(),
  resultId: uuid("result_id").notNull().references(() => results.id, { onDelete: "restrict" }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("SUBMITTED"), // SUBMITTED | UNDER_REVIEW | UPHELD | DISMISSED | WITHDRAWN
  decidedBy: uuid("decided_by"),
  decisionNote: text("decision_note"),
  decidedAt: ts("decided_at"),
  createdAt: createdAt(),
});

/* ---------------------------------------------------- transcripts, graduation, certificates */

export const transcripts = pgTable("transcripts", {
  id: id(),
  number: text("number").notNull().unique(),
  enrolmentId: uuid("enrolment_id").notNull().references(() => enrolments.id, { onDelete: "restrict" }),
  status: transcriptStatusEnum("status").notNull().default("DRAFT"),
  /** Frozen copy of everything printed on the transcript at approval time. */
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull().default({}),
  verifyToken: text("verify_token").notNull().unique(),
  approvedBy: uuid("approved_by"),
  issuedBy: uuid("issued_by"),
  issuedAt: ts("issued_at"),
  revokedReason: text("revoked_reason"),
  createdAt: createdAt(),
});

export const graduations = pgTable("graduations", {
  id: id(),
  enrolmentId: uuid("enrolment_id").notNull().unique().references(() => enrolments.id, { onDelete: "restrict" }),
  sessionId: uuid("session_id").references(() => academicSessions.id),
  status: graduationStatusEnum("status").notNull().default("ELIGIBLE"),
  eligibility: jsonb("eligibility").$type<Record<string, unknown>>().notNull().default({}),
  registrarBy: uuid("registrar_by"),
  registrarAt: ts("registrar_at"),
  boardBy: uuid("board_by"),
  boardAt: ts("board_at"),
  graduatedAt: ts("graduated_at"),
  notes: text("notes"),
  createdAt: createdAt(),
});

export const certificates = pgTable(
  "certificates",
  {
    id: id(),
    number: text("number").notNull().unique(),
    /** Random capability token embedded in the QR code; verification URL = /verify/<token>. */
    verifyToken: text("verify_token").notNull().unique(),
    enrolmentId: uuid("enrolment_id").notNull().references(() => enrolments.id, { onDelete: "restrict" }),
    graduationId: uuid("graduation_id").notNull().references(() => graduations.id, { onDelete: "restrict" }),
    awardTitle: text("award_title").notNull(),
    holderName: text("holder_name").notNull(),
    programmeName: text("programme_name").notNull(),
    awardDate: date("award_date").notNull(),
    cgpa: num("cgpa", 3, 2),
    classification: text("classification"),
    status: certificateStatusEnum("status").notNull().default("VALID"),
    issuedBy: uuid("issued_by"),
    issuedAt: ts("issued_at").notNull().defaultNow(),
    revokedAt: ts("revoked_at"),
    revokedBy: uuid("revoked_by"),
    revokedReason: text("revoked_reason"),
    supersededById: uuid("superseded_by_id"),
  },
  (t) => [index("certificates_enrol_idx").on(t.enrolmentId)],
);

export const verificationLog = pgTable("verification_log", {
  id: id(),
  query: text("query").notNull(),
  outcome: text("outcome").notNull(), // VERIFIED | NOT_FOUND | REVOKED | SUPERSEDED
  certificateId: uuid("certificate_id"),
  ipHash: text("ip_hash"),
  createdAt: createdAt(),
});

/* ----------------------------------------------- ministry formation & spiritual formation */

export const ministryPlacements = pgTable("ministry_placements", {
  id: id(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  enrolmentId: uuid("enrolment_id").references(() => enrolments.id, { onDelete: "set null" }),
  kind: text("kind").notNull(), // LOCAL_CHURCH | MISSION_FIELD | EVANGELISM | CHRISTIAN_ORG | COMMUNITY_PROJECT | TEACHING | PASTORAL | YOUTH | CHILDREN | MEDIA | MISSIONS_ORG
  organisation: text("organisation").notNull(),
  location: text("location"),
  supervisorName: text("supervisor_name"),
  supervisorContact: text("supervisor_contact"),
  mentorId: uuid("mentor_id").references(() => users.id, { onDelete: "set null" }),
  startsOn: date("starts_on"),
  endsOn: date("ends_on"),
  hoursRequired: integer("hours_required").notNull().default(0),
  status: text("status").notNull().default("PLANNED"), // PLANNED | ACTIVE | COMPLETED | CANCELLED
  finalOutcome: text("final_outcome"), // PASS | NOT_YET_COMPETENT — recorded by mentor/ministry office, never auto
  finalNote: text("final_note"),
  createdBy: uuid("created_by"),
  createdAt: createdAt(),
});

export const ministryActivities = pgTable(
  "ministry_activities",
  {
    id: id(),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    placementId: uuid("placement_id").references(() => ministryPlacements.id, { onDelete: "set null" }),
    kind: text("kind").notNull(), // EVANGELISM | MISSIONS | PRAYER | TEACHING | PASTORAL | OUTREACH | COMMUNITY | LEADERSHIP | MENTORSHIP | OTHER
    activityOn: date("activity_on").notNull(),
    hours: num("hours", 5, 1).notNull().default(1),
    description: text("description").notNull(),
    reflection: text("reflection"),
    status: text("status").notNull().default("SUBMITTED"), // SUBMITTED | VERIFIED | RETURNED
    verifiedBy: uuid("verified_by"),
    verifierNote: text("verifier_note"),
    verifiedAt: ts("verified_at"),
    createdAt: createdAt(),
  },
  (t) => [index("ministry_activities_student_idx").on(t.studentId, t.activityOn)],
);

export const practicumEvaluations = pgTable("practicum_evaluations", {
  id: id(),
  placementId: uuid("placement_id").notNull().references(() => ministryPlacements.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // SUPERVISOR | STUDENT_REFLECTION | FINAL
  evaluatorId: uuid("evaluator_id"),
  evaluatorName: text("evaluator_name"),
  /** competency → level (EMERGING | DEVELOPING | COMPETENT | STRONG). Qualitative, no spiritual "score". */
  ratings: jsonb("ratings").$type<Record<string, string>>().notNull().default({}),
  narrative: text("narrative"),
  recommendation: text("recommendation"),
  createdAt: createdAt(),
});

export const mentorAssignments = pgTable(
  "mentor_assignments",
  {
    mentorId: uuid("mentor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    startedOn: date("started_on").notNull().default(sql`current_date`),
    active: boolean("active").notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.mentorId, t.studentId] })],
);

export const formationEntries = pgTable(
  "formation_entries",
  {
    id: id(),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // PRAYER | BIBLE_STUDY | DISCIPLESHIP | FELLOWSHIP | EVANGELISM | SERVICE | CHARACTER | MENTORSHIP
    entryOn: date("entry_on").notNull().default(sql`current_date`),
    reflection: text("reflection").notNull(),
    /** Private to the student unless they choose to share with their assigned mentor. */
    sharedWithMentor: boolean("shared_with_mentor").notNull().default(false),
    mentorId: uuid("mentor_id"),
    mentorResponse: text("mentor_response"),
    respondedAt: ts("responded_at"),
    createdAt: createdAt(),
  },
  (t) => [index("formation_student_idx").on(t.studentId, t.entryOn)],
);

/* ------------------------------------------------------------------- research */

export const researchProjects = pgTable("research_projects", {
  id: id(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  enrolmentId: uuid("enrolment_id").references(() => enrolments.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  abstract: text("abstract"),
  supervisorId: uuid("supervisor_id").references(() => users.id, { onDelete: "set null" }),
  status: text("status").notNull().default("TOPIC"), // TOPIC | PROPOSAL | APPROVED_PROPOSAL | IN_PROGRESS | FINAL_SUBMITTED | VIVA | ASSESSED | APPROVED | ARCHIVED | REJECTED
  vivaOn: ts("viva_on"),
  score: num("score", 5, 2),
  grade: text("grade"),
  assessmentNote: text("assessment_note"),
  approvedBy: uuid("approved_by"),
  archivedAt: ts("archived_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const researchSubmissions = pgTable("research_submissions", {
  id: id(),
  projectId: uuid("project_id").notNull().references(() => researchProjects.id, { onDelete: "cascade" }),
  stage: text("stage").notNull(), // PROPOSAL | LITERATURE_REVIEW | CHAPTER | DRAFT | FINAL
  title: text("title").notNull(),
  body: text("body"),
  assetId: uuid("asset_id"),
  aiDisclosure: text("ai_disclosure"),
  feedback: text("feedback"),
  feedbackBy: uuid("feedback_by"),
  feedbackAt: ts("feedback_at"),
  createdAt: createdAt(),
});

/* -------------------------------------------------------------------- library */

export const libraryResources = pgTable(
  "library_resources",
  {
    id: id(),
    title: text("title").notNull(),
    author: text("author"),
    category: text("category").notNull().default("General"),
    publisher: text("publisher"),
    year: integer("year"),
    isbn: text("isbn"),
    resourceType: text("resource_type").notNull().default("BOOK"), // BOOK | ARTICLE | LECTURE_NOTE | STUDY_GUIDE | JOURNAL | REFERENCE | AUDIO | VIDEO | RESEARCH | LINK | TOOL
    accessLevel: text("access_level").notNull().default("STUDENTS"), // PUBLIC | STUDENTS | FACULTY
    assetId: uuid("asset_id"),
    externalUrl: text("external_url"),
    citation: text("citation"),
    description: text("description"),
    /** Uploading a file requires the librarian to confirm the institution holds the rights (spec §34). */
    rightsConfirmed: boolean("rights_confirmed").notNull().default(false),
    rightsNote: text("rights_note"),
    hub: text("hub"), // TECH | KINGDOM_ENTERPRISE | null — surfaces the resource in the Technology / Kingdom Enterprise hubs
    status: contentStatusEnum("status").notNull().default("DRAFT"),
    createdBy: uuid("created_by"),
    createdAt: createdAt(),
  },
  (t) => [index("library_status_idx").on(t.status, t.category)],
);

/* ------------------------------------------------------- communication & finance */

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    category: text("category").notNull(), // ADMISSION | REGISTRATION | ASSIGNMENT | EXAMINATION | RESULT | ACADEMIC_WARNING | GRADUATION | CERTIFICATE | ANNOUNCEMENT | PRACTICUM | RESEARCH | SECURITY
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt, t.createdAt)],
);

export const emailOutbox = pgTable("email_outbox", {
  id: id(),
  userId: uuid("user_id"),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  bodyText: text("body_text").notNull(),
  bodyHtml: text("body_html"),
  status: text("status").notNull().default("QUEUED"), // QUEUED | SENT | HELD | FAILED
  error: text("error"),
  createdAt: createdAt(),
  sentAt: ts("sent_at"),
});

export const invoices = pgTable(
  "invoices",
  {
    id: id(),
    number: text("number").notNull().unique(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    applicationId: uuid("application_id"),
    kind: text("kind").notNull(), // APPLICATION | TUITION | COURSE | EXAMINATION | CERTIFICATE | TRANSCRIPT | OTHER
    description: text("description").notNull(),
    amount: num("amount", 12, 2).notNull(),
    currency: text("currency").notNull().default("NGN"),
    status: text("status").notNull().default("UNPAID"), // UNPAID | PARTIAL | PAID | VOID | WAIVED
    dueOn: date("due_on"),
    createdBy: uuid("created_by"),
    createdAt: createdAt(),
  },
  (t) => [index("invoices_user_idx").on(t.userId, t.status)],
);

export const payments = pgTable("payments", {
  id: id(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "restrict" }),
  receiptNo: text("receipt_no").notNull().unique(),
  amount: num("amount", 12, 2).notNull(),
  method: text("method").notNull(), // BANK_TRANSFER | CASH | CARD | POS | OTHER
  reference: text("reference"),
  status: text("status").notNull().default("CONFIRMED"), // CONFIRMED | REVERSED
  paidAt: ts("paid_at").notNull().defaultNow(),
  recordedBy: uuid("recorded_by"),
  note: text("note"),
});

/* ------------------------------------------------- integrity, quality, governance */

export const integrityCases = pgTable("integrity_cases", {
  id: id(),
  caseNo: text("case_no").notNull().unique(),
  kind: text("kind").notNull(), // PLAGIARISM | CHEATING | FABRICATION | FALSE_CITATION | COLLABORATION | EXAM_MISCONDUCT | IDENTITY_FRAUD | AI_MISUSE | OTHER
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "restrict" }),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
  reportedBy: uuid("reported_by"),
  description: text("description").notNull(),
  evidence: jsonb("evidence").$type<{ note: string; assetId?: string }[]>().notNull().default([]),
  status: text("status").notNull().default("REPORTED"), // REPORTED | INVESTIGATING | DECIDED | APPEALED | CLOSED
  investigatorId: uuid("investigator_id"),
  decision: text("decision"),
  sanction: text("sanction"),
  decidedBy: uuid("decided_by"),
  decidedAt: ts("decided_at"),
  appealNote: text("appeal_note"),
  appealDecision: text("appeal_decision"),
  createdAt: createdAt(),
});

export const evaluations = pgTable(
  "evaluations",
  {
    id: id(),
    kind: text("kind").notNull(), // COURSE | FACULTY | PROGRAMME | GENERAL
    offeringId: uuid("offering_id").references(() => offerings.id, { onDelete: "cascade" }),
    programmeId: uuid("programme_id").references(() => programmes.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    ratings: jsonb("ratings").$type<Record<string, number>>().notNull().default({}),
    comment: text("comment"),
    createdAt: createdAt(),
  },
  (t) => [index("evaluations_offering_idx").on(t.offeringId)],
);

export const boardDecisions = pgTable("board_decisions", {
  id: id(),
  kind: text("kind").notNull(), // PROGRAMME | COURSE | POLICY | GRADUATION | APPEAL | OTHER
  refType: text("ref_type"),
  refId: text("ref_id"),
  title: text("title").notNull(),
  decision: text("decision").notNull(), // APPROVED | REJECTED | DEFERRED
  notes: text("notes"),
  decidedBy: uuid("decided_by"),
  decidedAt: ts("decided_at").notNull().defaultNow(),
});

export const aiRequests = pgTable("ai_requests", {
  id: id(),
  userId: uuid("user_id").notNull(),
  purpose: text("purpose").notNull(),
  prompt: text("prompt").notNull(),
  provider: text("provider"),
  model: text("model"),
  status: text("status").notNull().default("OK"),
  createdAt: createdAt(),
});

export type SchemaUser = typeof users.$inferSelect;
