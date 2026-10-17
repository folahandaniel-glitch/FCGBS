import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { can, type Permission, type SuperCapability } from "@/core/permissions";
import { getDb } from "./db";
import * as s from "./db/schema";
import { audit, type Actor, type ReqCtx } from "./audit";
import { AppError } from "./errors";

/**
 * Config-driven CRUD for the institution's own data (departments, programmes, courses, calendar, offerings,
 * news, library …). Everything here is editable by the Super Admin or by an administrator who has been granted
 * the matching permission — no developer needed. Every save is validated, versioned where relevant, and audited
 * with before/after values. Workflow rule: only holders of `approvePerm` may move content to Approved/Published.
 */
export type FieldType = "text" | "textarea" | "number" | "select" | "date" | "datetime" | "bool" | "lines" | "image" | "topics" | "file";
export interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
  lookup?: "departments" | "programmeLevels" | "courses" | "terms" | "lecturers" | "campuses" | "sessions" | "teachings" | "tracks";
  rows?: number;
  accept?: string;
  list?: boolean;
  nullable?: boolean;
}
export interface Resource {
  key: string;
  label: string;
  singular: string;
  table: PgTable;
  perm: (Permission | SuperCapability)[];
  approvePerm?: Permission;
  fields: Field[];
  search?: string[];
  order?: string;
  help?: string;
  canDelete?: boolean;
}

const STATUS = ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() }));
const AUDIENCE = ["PUBLIC", "STUDENTS", "FACULTY", "ALUMNI", "STAFF"].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() }));

export const RESOURCES: Record<string, Resource> = {
  departments: { key: "departments", label: "Departments", singular: "Department", table: s.departments, perm: ["programmes.manage"], search: ["name", "code"], order: "sort", canDelete: false,
    fields: [{ name: "code", label: "Code", type: "text", required: true, list: true }, { name: "name", label: "Name", type: "text", required: true, list: true }, { name: "description", label: "Description", type: "textarea" }, { name: "hodUserId", label: "Head of Department", type: "select", lookup: "lecturers", nullable: true }, { name: "sort", label: "Order", type: "number" }, { name: "active", label: "Active", type: "bool", list: true }] },
  campuses: { key: "campuses", label: "Campuses & learning centres", singular: "Campus", table: s.campuses, perm: ["programmes.manage"], search: ["name", "code"], help: "Add physical campuses or learning centres later without changing the system.",
    fields: [{ name: "code", label: "Code", type: "text", required: true, list: true }, { name: "name", label: "Name", type: "text", required: true, list: true }, { name: "address", label: "Address", type: "textarea" }, { name: "country", label: "Country", type: "text", list: true }, { name: "timezone", label: "Time zone", type: "text" }, { name: "isOnline", label: "Online campus", type: "bool", list: true }, { name: "active", label: "Active", type: "bool" }] },
  levels: { key: "levels", label: "Programme levels", singular: "Level", table: s.programmeLevels, perm: ["programmes.manage"], order: "rank", help: "Certificate, Diploma, Advanced Diploma — add higher levels here.",
    fields: [{ name: "key", label: "Key (UPPER_SNAKE)", type: "text", required: true }, { name: "name", label: "Name", type: "text", required: true, list: true }, { name: "rank", label: "Rank", type: "number", required: true, list: true }, { name: "description", label: "Description", type: "textarea" }] },
  programmes: { key: "programmes", label: "Programmes", singular: "Programme", table: s.programmes, perm: ["programmes.manage"], approvePerm: "curriculum.approve", search: ["name", "code"], order: "sort", help: "Publishing requires Academic Board approval (curriculum.approve). Every change is versioned and audited.",
    fields: [{ name: "code", label: "Code", type: "text", required: true, list: true }, { name: "name", label: "Name", type: "text", required: true, list: true }, { name: "slug", label: "URL slug", type: "text", required: true }, { name: "levelId", label: "Level", type: "select", lookup: "programmeLevels", required: true, list: true }, { name: "departmentId", label: "Department", type: "select", lookup: "departments", nullable: true }, { name: "description", label: "Description", type: "textarea" }, { name: "objectives", label: "Objectives", type: "lines" }, { name: "learningOutcomes", label: "Learning outcomes", type: "lines" }, { name: "admissionRequirements", label: "Admission requirements", type: "lines" }, { name: "graduationRequirements", label: "Graduation requirements", type: "lines" }, { name: "practicalRequirements", label: "Practical requirements", type: "textarea" }, { name: "assessmentRequirements", label: "Assessment requirements", type: "textarea" }, { name: "recognitionNote", label: "Recognition statement", type: "textarea", hint: "State accreditation only if verified." }, { name: "durationMonths", label: "Duration (months)", type: "number" }, { name: "minCredits", label: "Minimum credits", type: "number", list: true }, { name: "minCgpa", label: "Minimum CGPA", type: "number" }, { name: "practicumHours", label: "Practicum hours", type: "number" }, { name: "researchRequired", label: "Research / capstone required", type: "bool" }, { name: "tuitionFee", label: "Tuition fee", type: "number" }, { name: "currency", label: "Currency", type: "text" }, { name: "sort", label: "Order", type: "number" }, { name: "status", label: "Status", type: "select", options: STATUS, required: true, list: true }] },
  courses: { key: "courses", label: "Courses", singular: "Course", table: s.courses, perm: ["courses.manage"], approvePerm: "curriculum.approve", search: ["title", "code"], order: "code", help: "Course syllabus, outcomes, credits and weights. Lessons are edited from the course's lesson page.",
    fields: [{ name: "code", label: "Code", type: "text", required: true, list: true }, { name: "title", label: "Title", type: "text", required: true, list: true }, { name: "description", label: "Description", type: "textarea" }, { name: "departmentId", label: "Department", type: "select", lookup: "departments", nullable: true, list: true }, { name: "levelRank", label: "Level (1–3)", type: "number", list: true }, { name: "credits", label: "Credit units", type: "number", required: true, list: true }, { name: "contactHours", label: "Contact hours", type: "number" }, { name: "category", label: "Category", type: "text", hint: "e.g. BIBLICAL, THEOLOGY, MINISTRY, FIVEFOLD, TECH_HUB, KINGDOM_ENTERPRISE" }, { name: "objectives", label: "Objectives", type: "lines" }, { name: "outcomes", label: "Learning outcomes", type: "lines" }, { name: "topics", label: "Course topics", type: "topics" }, { name: "readings", label: "Required resources / reading", type: "lines" }, { name: "practicalRequirements", label: "Practical requirements", type: "textarea" }, { name: "ministryRequirements", label: "Ministry requirements", type: "textarea" }, { name: "attendanceMinPct", label: "Minimum attendance %", type: "number" }, { name: "status", label: "Status", type: "select", options: STATUS, required: true, list: true }] },
  sessions: { key: "sessions", label: "Academic sessions", singular: "Session", table: s.academicSessions, perm: ["calendar.manage"], order: "-startsOn",
    fields: [{ name: "name", label: "Name (e.g. 2026/2027)", type: "text", required: true, list: true }, { name: "startsOn", label: "Starts", type: "date", required: true, list: true }, { name: "endsOn", label: "Ends", type: "date", required: true, list: true }, { name: "admissionDeadline", label: "Admission deadline", type: "date", nullable: true }, { name: "isCurrent", label: "Current session", type: "bool", list: true }] },
  terms: { key: "terms", label: "Semesters", singular: "Semester", table: s.academicTerms, perm: ["calendar.manage"], order: "-startsOn", help: "Registration and examination periods are set per semester.",
    fields: [{ name: "sessionId", label: "Session", type: "select", lookup: "sessions", required: true, list: true }, { name: "name", label: "Name", type: "text", required: true, list: true }, { name: "ordinal", label: "Order", type: "number", required: true }, { name: "startsOn", label: "Starts", type: "date", required: true, list: true }, { name: "endsOn", label: "Ends", type: "date", required: true }, { name: "registrationOpens", label: "Registration opens", type: "date", nullable: true }, { name: "registrationCloses", label: "Registration closes", type: "date", nullable: true }, { name: "examsStart", label: "Exams start", type: "date", nullable: true }, { name: "examsEnd", label: "Exams end", type: "date", nullable: true }, { name: "isCurrent", label: "Current semester", type: "bool", list: true }] },
  events: { key: "events", label: "Calendar events", singular: "Event", table: s.academicEvents, perm: ["calendar.manage"], order: "-startsOn", help: "Orientation, holidays, breaks, graduation, admission deadlines.",
    fields: [{ name: "kind", label: "Kind", type: "select", options: ["ORIENTATION", "HOLIDAY", "BREAK", "GRADUATION", "ADMISSION_DEADLINE", "EXAM_PERIOD", "OTHER"].map((v) => ({ value: v, label: v.replace(/_/g, " ").toLowerCase() })), required: true, list: true }, { name: "title", label: "Title", type: "text", required: true, list: true }, { name: "startsOn", label: "Starts", type: "date", required: true, list: true }, { name: "endsOn", label: "Ends", type: "date", nullable: true }, { name: "sessionId", label: "Session", type: "select", lookup: "sessions", nullable: true }, { name: "notes", label: "Notes", type: "textarea" }] },
  offerings: { key: "offerings", label: "Course offerings", singular: "Offering", table: s.offerings, perm: ["offerings.manage"], order: "-createdAt", help: "Open a course for a semester and assign the lecturer. Students register against offerings.",
    fields: [{ name: "courseId", label: "Course", type: "select", lookup: "courses", required: true, list: true }, { name: "termId", label: "Semester", type: "select", lookup: "terms", required: true, list: true }, { name: "lecturerId", label: "Lecturer", type: "select", lookup: "lecturers", nullable: true, list: true }, { name: "campusId", label: "Campus", type: "select", lookup: "campuses", nullable: true }, { name: "capacity", label: "Capacity", type: "number", nullable: true }, { name: "meetingUrl", label: "Live class link (https)", type: "text" }, { name: "status", label: "Status", type: "select", options: [{ value: "OPEN", label: "Open" }, { value: "CLOSED", label: "Closed" }], required: true, list: true }] },
  posts: { key: "posts", label: "News, events, announcements & FAQs", singular: "Post", table: s.posts, perm: ["content.manage"], approvePerm: "content.publish", search: ["title"], order: "-createdAt", help: "Appear on the website, the homepage carousel (if flagged) and student portal.",
    fields: [{ name: "kind", label: "Type", type: "select", options: ["NEWS", "EVENT", "ANNOUNCEMENT", "FAQ", "ARTICLE"].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() })), required: true, list: true }, { name: "title", label: "Title / question", type: "text", required: true, list: true }, { name: "slug", label: "URL slug", type: "text", required: true }, { name: "summary", label: "Summary", type: "textarea" }, { name: "body", label: "Body / answer", type: "textarea" }, { name: "imageAssetId", label: "Picture", type: "image", nullable: true }, { name: "startsAt", label: "Starts (events)", type: "datetime", nullable: true }, { name: "endsAt", label: "Ends (events)", type: "datetime", nullable: true }, { name: "location", label: "Location", type: "text" }, { name: "audience", label: "Audience", type: "select", options: AUDIENCE, required: true, list: true }, { name: "showInCarousel", label: "Show in homepage carousel", type: "bool", list: true }, { name: "pinned", label: "Pinned", type: "bool" }, { name: "linkUrl", label: "Button link", type: "text" }, { name: "linkLabel", label: "Button label", type: "text" }, { name: "sort", label: "Order", type: "number" }, { name: "status", label: "Status", type: "select", options: STATUS, required: true, list: true }] },
  library: { key: "library", label: "Library resources", singular: "Resource", table: s.libraryResources, perm: ["library.manage"], search: ["title", "author"], order: "-createdAt", help: "Do not upload copyrighted books without rights. Confirm rights before attaching a file; otherwise list the citation and a lawful link.",
    fields: [{ name: "title", label: "Title", type: "text", required: true, list: true }, { name: "author", label: "Author", type: "text", list: true }, { name: "category", label: "Category", type: "text", required: true, list: true }, { name: "resourceType", label: "Type", type: "select", options: ["BOOK", "ARTICLE", "LECTURE_NOTE", "STUDY_GUIDE", "JOURNAL", "REFERENCE", "AUDIO", "VIDEO", "RESEARCH", "LINK", "TOOL"].map((v) => ({ value: v, label: v.replace(/_/g, " ").toLowerCase() })), required: true }, { name: "publisher", label: "Publisher", type: "text" }, { name: "year", label: "Year", type: "number", nullable: true }, { name: "isbn", label: "ISBN", type: "text" }, { name: "accessLevel", label: "Access", type: "select", options: ["PUBLIC", "STUDENTS", "FACULTY"].map((v) => ({ value: v, label: v.toLowerCase() })), required: true }, { name: "externalUrl", label: "External link (https)", type: "text" }, { name: "citation", label: "Citation", type: "textarea" }, { name: "description", label: "Description", type: "textarea" }, { name: "rightsConfirmed", label: "The school holds the rights to distribute the attached file", type: "bool" }, { name: "rightsNote", label: "Rights note (licence, permission, public domain)", type: "text" }, { name: "hub", label: "Hub", type: "select", options: [{ value: "", label: "None" }, { value: "TECH", label: "Technology Hub" }, { value: "KINGDOM_ENTERPRISE", label: "Kingdom Enterprise" }], nullable: true }, { name: "status", label: "Status", type: "select", options: STATUS, required: true, list: true }] },
  teachingTracks: { key: "teachingTracks", label: "Teaching tracks", singular: "Track", table: s.teachingTracks, perm: ["content.manage"], approvePerm: "content.publish", search: ["title"], order: "sort", canDelete: false, help: "Tracks group teachings (Apostolic, Pastoral, Evangelical, Prophetic, Revival & Reformation …). Add any new track you need; archive instead of deleting.",
    fields: [{ name: "title", label: "Title", type: "text", required: true, list: true }, { name: "slug", label: "URL slug (lower-case, hyphens)", type: "text", required: true, list: true }, { name: "tagline", label: "Tagline", type: "text" }, { name: "description", label: "Description", type: "textarea", rows: 4 }, { name: "colour", label: "Colour", type: "select", options: ["royal","gold","amber","emerald","teal","violet","rose","sky"].map((v) => ({ value: v, label: v })), required: true, list: true }, { name: "icon", label: "Icon", type: "select", options: ["compass","shepherd","megaphone","flame","spark","landmark","book","cpu"].map((v) => ({ value: v, label: v })) }, { name: "sort", label: "Order", type: "number", list: true }, { name: "status", label: "Status", type: "select", options: STATUS, required: true, list: true }] },
  teachings: { key: "teachings", label: "Teachings", singular: "Teaching", table: s.teachings, perm: ["content.manage"], approvePerm: "content.publish", search: ["title", "summary"], order: "-updatedAt", canDelete: true, help: "Add or edit teachings. Write the body in simple Markdown: ## headings, - bullets, 1. numbers, > quotes, **bold**. Everything you write must be original or properly licensed.",
    fields: [{ name: "trackId", label: "Track", type: "select", lookup: "tracks", required: true, list: true }, { name: "title", label: "Title", type: "text", required: true, list: true }, { name: "slug", label: "URL slug (lower-case, hyphens)", type: "text", required: true }, { name: "summary", label: "Summary (one or two sentences)", type: "textarea", rows: 3 }, { name: "body", label: "Teaching (Markdown)", type: "textarea", rows: 26 }, { name: "scriptures", label: "Scripture references (one per line, e.g. Acts 2:1-4)", type: "textarea", rows: 5 }, { name: "level", label: "Level", type: "select", options: ["FOUNDATION", "INTERMEDIATE", "ADVANCED"].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() })), required: true, list: true }, { name: "minutes", label: "Reading minutes", type: "number" }, { name: "author", label: "Author / teacher", type: "text" }, { name: "audioAssetId", label: "Audio file (MP3)", type: "file", accept: "audio/mpeg,.mp3" }, { name: "audioUrl", label: "Audio link (https, optional)", type: "text" }, { name: "videoUrl", label: "Video link (YouTube or Vimeo, https)", type: "text" }, { name: "imageAssetId", label: "Picture", type: "image", nullable: true }, { name: "featured", label: "Feature on the teachings home", type: "bool", list: true }, { name: "audience", label: "Who can read it", type: "select", options: [{ value: "PUBLIC", label: "Everyone" }, { value: "STUDENTS", label: "Signed-in students only" }], required: true, list: true }, { name: "sort", label: "Order", type: "number" }, { name: "status", label: "Status", type: "select", options: STATUS, required: true, list: true }] },
  materials: { key: "materials", label: "Study materials", singular: "Material", table: s.materials, perm: ["courses.manage", "content.manage"], search: ["title"], order: "-createdAt", canDelete: true, help: "Attach Word, PowerPoint, PDF, MP3, video or web links to a course or a teaching. Upload only files the school owns or has permission to share; for other works, add a link to a lawful source.",
    fields: [{ name: "title", label: "Title", type: "text", required: true, list: true }, { name: "kind", label: "Type", type: "select", options: [["PDF", "PDF"], ["DOCX", "Word (DOCX)"], ["PPTX", "PowerPoint (PPTX)"], ["MP3", "Audio (MP3)"], ["VIDEO", "Video link"], ["URL", "Web link"], ["OTHER", "Other file"]].map(([value, label]) => ({ value, label })), required: true, list: true }, { name: "description", label: "Description", type: "textarea", rows: 3 }, { name: "courseId", label: "Attach to course", type: "select", lookup: "courses", nullable: true, list: true }, { name: "teachingId", label: "Attach to teaching", type: "select", lookup: "teachings", nullable: true }, { name: "assetId", label: "File (PDF, DOCX, PPTX, MP3, up to the upload limit)", type: "file", accept: ".pdf,.docx,.pptx,.mp3,.xlsx,.png,.jpg" }, { name: "url", label: "Link (https) — for web links and videos", type: "text" }, { name: "place", label: "Other place (advanced: question:slug, lesson:id, timeline:id, topic:slug, plan:slug, track:slug, programme:code). Easier: use Admin → Files & links.", type: "text" }, { name: "audience", label: "Who can open it", type: "select", options: [{ value: "STUDENTS", label: "Signed-in students" }, { value: "PUBLIC", label: "Everyone" }], required: true, list: true }, { name: "sort", label: "Order", type: "number" }, { name: "status", label: "Status", type: "select", options: STATUS, required: true, list: true }] },
  hardQuestions: { key: "hardQuestions", label: "Hard questions", singular: "Question", table: s.hardQuestions, perm: ["content.manage"], approvePerm: "content.publish", search: ["title", "summary"], order: "sort", canDelete: true, help: "Add any disputed or difficult question. Fill each lens that applies (leave the others empty): the page shows only the lenses you complete. Write in simple Markdown (## headings, - bullets, > quotes, **bold**). Be fair to the views of other Christians, and never invent archaeological or historical claims.",
    fields: [{ name: "title", label: "Question", type: "text", required: true, list: true }, { name: "slug", label: "URL slug (lower-case, hyphens)", type: "text", required: true }, { name: "category", label: "Category", type: "text", required: true, list: true, hint: "e.g. Jesus Christ, God and evil, Origins, The Bible, Church and practice, Last things" }, { name: "summary", label: "Short answer", type: "textarea", rows: 4 }, { name: "exegetical", label: "Exegetical — what the text says and means", type: "textarea", rows: 14 }, { name: "genealogical", label: "Genealogical and historical record", type: "textarea", rows: 8 }, { name: "archaeological", label: "Archaeological and historical evidence", type: "textarea", rows: 8 }, { name: "apostolic", label: "Apostolic witness (the apostles' teaching)", type: "textarea", rows: 8 }, { name: "prophetic", label: "Prophetic dimension (promise, fulfilment, prophecy)", type: "textarea", rows: 8 }, { name: "theological", label: "Theological synthesis", type: "textarea", rows: 12 }, { name: "views", label: "Where faithful Christians differ", type: "textarea", rows: 6 }, { name: "pastoral", label: "Pastoral note", type: "textarea", rows: 5 }, { name: "scriptures", label: "Key Scriptures (one per line)", type: "textarea", rows: 5 }, { name: "readings", label: "Further reading (one per line)", type: "textarea", rows: 4 }, { name: "featured", label: "Feature on the home page of Hard Questions", type: "bool", list: true }, { name: "sort", label: "Order", type: "number" }, { name: "status", label: "Status", type: "select", options: STATUS, required: true, list: true }] },
};

const col = (r: Resource, name: string) => (r.table as unknown as Record<string, PgColumn>)[name];

/** Resolves select options for lookup fields. */
export async function lookupOptions(kind: NonNullable<Field["lookup"]>) {
  const db = getDb();
  switch (kind) {
    case "departments": return (await db.select({ v: s.departments.id, l: s.departments.name }).from(s.departments).orderBy(asc(s.departments.sort))).map((x) => ({ value: x.v, label: x.l }));
    case "programmeLevels": return (await db.select({ v: s.programmeLevels.id, l: s.programmeLevels.name }).from(s.programmeLevels).orderBy(asc(s.programmeLevels.rank))).map((x) => ({ value: x.v, label: x.l }));
    case "courses": return (await db.select({ v: s.courses.id, l: sql<string>`${s.courses.code} || ' — ' || ${s.courses.title}` }).from(s.courses).orderBy(asc(s.courses.code))).map((x) => ({ value: x.v, label: x.l }));
    case "terms": return (await db.select({ v: s.academicTerms.id, l: sql<string>`${s.academicSessions.name} || ' · ' || ${s.academicTerms.name}` }).from(s.academicTerms).innerJoin(s.academicSessions, eq(s.academicSessions.id, s.academicTerms.sessionId)).orderBy(desc(s.academicTerms.startsOn))).map((x) => ({ value: x.v, label: x.l }));
    case "sessions": return (await db.select({ v: s.academicSessions.id, l: s.academicSessions.name }).from(s.academicSessions).orderBy(desc(s.academicSessions.startsOn))).map((x) => ({ value: x.v, label: x.l }));
    case "tracks": return (await db.select({ v: s.teachingTracks.id, l: s.teachingTracks.title }).from(s.teachingTracks).orderBy(asc(s.teachingTracks.sort))).map((x) => ({ value: x.v, label: x.l }));
    case "teachings": return (await db.select({ v: s.teachings.id, l: sql<string>`${s.teachingTracks.title} || ' — ' || ${s.teachings.title}` }).from(s.teachings).innerJoin(s.teachingTracks, eq(s.teachingTracks.id, s.teachings.trackId)).orderBy(asc(s.teachingTracks.sort), asc(s.teachings.sort))).map((x) => ({ value: x.v, label: x.l }));
    case "campuses": return (await db.select({ v: s.campuses.id, l: s.campuses.name }).from(s.campuses)).map((x) => ({ value: x.v, label: x.l }));
    case "lecturers": return (await db.select({ v: s.users.id, l: sql<string>`${s.users.firstName} || ' ' || ${s.users.lastName}` }).from(s.users).where(eq(s.users.userType, "STAFF")).orderBy(asc(s.users.lastName))).map((x) => ({ value: x.v, label: x.l }));
  }
}

export async function listResource(r: Resource, q?: string, limit = 200) {
  const db = getDb();
  const conds: SQL[] = [];
  if (q && r.search?.length) conds.push(or(...r.search.map((c) => ilike(col(r, c), `%${q}%`)))!);
  const ord = r.order?.startsWith("-") ? desc(col(r, r.order.slice(1))) : asc(col(r, r.order ?? r.fields[0].name));
  return db.select().from(r.table).where(conds.length ? and(...conds) : undefined).orderBy(ord).limit(limit) as unknown as Promise<Record<string, unknown>[]>;
}

export async function getResource(r: Resource, id: string) {
  const [row] = await getDb().select().from(r.table).where(eq(col(r, "id"), id)).limit(1) as unknown as Record<string, unknown>[];
  return row ?? null;
}

function coerce(f: Field, raw: FormDataEntryValue | null): unknown {
  const v = raw === null ? "" : String(raw).trim();
  switch (f.type) {
    case "bool": return raw === "on" || raw === "true";
    case "number": if (v === "") return f.nullable ? null : 0; { const n = Number(v); if (!Number.isFinite(n)) throw new AppError("VALIDATION", `${f.label} must be a number.`, { [f.name]: ["Enter a number."] }); return n; }
    case "lines": return String(raw ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
    case "topics": return String(raw ?? "").split("\n").map((x) => x.trim()).filter(Boolean).map((ln) => { const [title, pts] = ln.split("::"); return { title: title.trim(), points: (pts ?? "").split(";").map((p) => p.trim()).filter(Boolean) }; });
    case "date": return v === "" ? null : v;
    case "datetime": return v === "" ? null : new Date(v);
    case "select": case "image": case "file": return v === "" ? (f.nullable ? null : "") : v;
    default: return v === "" ? (f.nullable ? null : "") : v;
  }
}

export async function saveResource(actor: Actor, r: Resource, id: string | null, form: FormData, ctx: ReqCtx) {
  if (!r.perm.some((p) => can(actor, p))) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  const values: Record<string, unknown> = {};
  const fieldErrors: Record<string, string[]> = {};
  for (const f of r.fields) {
    const v = coerce(f, form.get(f.name));
    if (f.required && (v === "" || v === null || v === undefined)) fieldErrors[f.name] = [`${f.label} is required.`];
    if (/url$/i.test(f.name) && typeof v === "string" && v && !/^https:\/\//.test(v) && !v.startsWith("/")) fieldErrors[f.name] = ["Use an https:// link."];
    values[f.name] = v;
  }
  if (Object.keys(fieldErrors).length) throw new AppError("VALIDATION", "Please correct the highlighted fields.", fieldErrors);
  // Content workflow: only approvers may approve/publish; others are held at Review.
  if (r.approvePerm && (values.status === "APPROVED" || values.status === "PUBLISHED") && !can(actor, r.approvePerm)) {
    values.status = "REVIEW";
  }
  if (r.key === "courses") {
    const w = (id ? ((await getResource(r, id))?.assessmentWeights as Record<string, number> | undefined) : undefined) ?? { assignment: 20, test: 20, exam: 60, practical: 0 };
    values.assessmentWeights = w;
  }
  if (r.key === "posts" && values.status === "PUBLISHED") values.publishedAt = new Date();
  const approving = (r.key === "programmes" || r.key === "courses") && (values.status === "APPROVED" || values.status === "PUBLISHED");
  if (r.key === "programmes" && approving) { values.approvedBy = actor.id; values.approvedAt = new Date(); }
  if (r.key === "posts") values.authorId = actor.id;
  const db = getDb();
  return db.transaction(async (tx) => {
    let before: Record<string, unknown> | null = null;
    let rowId = id;
    if (id) {
      before = (await tx.select().from(r.table).where(eq(col(r, "id"), id)).limit(1) as unknown as Record<string, unknown>[])[0] ?? null;
      if (!before) throw new AppError("NOT_FOUND", "Record not found.");
      const patch: Record<string, unknown> = { ...values };
      if ("version" in (before ?? {})) patch.version = Number(before!.version) + 1;
      if ("updatedAt" in (before ?? {})) patch.updatedAt = new Date();
      await tx.update(r.table).set(patch as never).where(eq(col(r, "id"), id));
    } else {
      const [row] = await tx.insert(r.table).values(values as never).returning() as unknown as Record<string, unknown>[];
      rowId = String(row.id);
    }
    // Only one current session / semester.
    if (r.key === "sessions" && values.isCurrent) await tx.update(s.academicSessions).set({ isCurrent: false }).where(sql`${s.academicSessions.id} <> ${rowId}`);
    if (r.key === "terms" && values.isCurrent) await tx.update(s.academicTerms).set({ isCurrent: false }).where(sql`${s.academicTerms.id} <> ${rowId}`);
    if (approving) await tx.insert(s.boardDecisions).values({ kind: r.key === "programmes" ? "PROGRAMME" : "COURSE", refType: r.key, refId: rowId, title: String(values.name ?? values.title ?? values.code), decision: "APPROVED", decidedBy: actor.id });
    const changed = before ? Object.fromEntries(Object.entries(values).filter(([k, v]) => JSON.stringify(before![k]) !== JSON.stringify(v)).map(([k, v]) => [k, { from: before![k], to: v }])) : undefined;
    await audit({ actor, action: `${r.key}.${id ? "updated" : "created"}`, entityType: r.key, entityId: rowId, summary: String(values.title ?? values.name ?? values.code ?? ""), metadata: changed ?? { created: values } }, ctx, tx);
    return rowId!;
  });
}

export async function deleteResource(actor: Actor, r: Resource, id: string, ctx: ReqCtx) {
  if (!r.canDelete || !r.perm.some((p) => can(actor, p))) throw new AppError("FORBIDDEN", "This record cannot be deleted. Archive it instead.");
  await getDb().delete(r.table).where(eq(col(r, "id"), id));
  await audit({ actor, action: `${r.key}.deleted`, entityType: r.key, entityId: id }, ctx);
}

export const resourceFor = (key: string) => RESOURCES[key] ?? null;
