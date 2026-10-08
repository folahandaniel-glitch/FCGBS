# Architecture

## 1. System audit (what was reused, what was new)

The brief asked not to rebuild blindly and not to damage the existing **Fodan College (FODAN CBT ACADEMY)** project. That project was *read only*. Its proven *concepts* were reused as patterns — Argon2id auth with hashed sessions and TOTP, permission-checked server actions and API wrappers, append-only audit log, Postgres-backed rate limiting, versioned CMS blocks, upload sniffing, PGlite-based tests, the navy/royal/gold design tokens — and re-implemented here for a *different domain* (a theological institution, not a secondary-school CBT platform). Domain-specific parts of the old project (access codes, JSS/SS sections, question-pack imports, parents' portal) were intentionally **not** carried over.

| Concern | Decision |
|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript, Tailwind 4 |
| DB | PostgreSQL via Drizzle ORM; migrations in `drizzle/`; PGlite locally, Neon/Vercel Postgres in production |
| Auth | Argon2id, 256-bit session tokens stored as HMAC hashes, TOTP 2FA, lockout, rate limits |
| Authz | Permission catalogue (`src/core/permissions.ts`) → roles (editable) → server-side checks everywhere; scope rules in services |
| Heavy things avoided | no charting library, no client state library, no rich-text editor (Markdown subset rendered safely), one font file |

## 2. Layers

```
src/core/      pure domain logic (no framework/DB): permissions, grading, GPA, standing, graduation rules
src/server/    db schema, auth, http wrappers, audit, settings, services (admissions, academics, assessments,
               credentials, documents, formation, curriculum, people, ops, reports, search), seed, admin-resources
src/app/       (site) public · (auth) sign-in/registration · apply · student · teach · admin · api/v1
src/components UI primitives, shells, editors, student/exam components
src/content/   default website text, curriculum (courses A/B, programmes), lessons, policies
```

Business rules live in `src/server/services/*` and `src/core/*`, **not** in pages — a future Android/iOS/PWA client can use the same `/api/v1` layer. Pages call services; server actions and API routes are thin wrappers that enforce authentication and permission first.

## 3. Database (ERD summary)

Identity: `users`, `sessions`, `recovery_codes`, `password_reset_tokens`, `roles`, `role_permissions`, `user_roles`.
Institution: `campuses`, `departments`, `staff_profiles`, `programme_levels`, `programmes`, `courses`, `programme_courses`, `course_relations` (prerequisite/co-requisite).
Calendar: `academic_sessions`, `academic_terms`, `academic_events`, `offerings` (course × semester × lecturer × schedule), `offering_staff`.
Admissions: `applications`, `application_documents`.
Students (identity ≠ academic facts): `students`, `enrolments` (programme level), `course_registrations` (registered / exemption / transfer; repeats), `alumni_profiles`.
Learning: `modules`, `lessons` (authority = institutional/academic/lecturer), `lesson_progress`, `attendance_sessions/records`, `discussion_posts/reports`, `user_blocks`.
Assessment: `questions` (bank), `assessments`, `submissions`, `exam_attempts` (immutable snapshot, events).
Results: `results` (components, grade, workflow status), `result_amendments`, `academic_appeals`.
Credentials: `transcripts`, `graduations`, `certificates`, `verification_log`.
Formation: `ministry_placements`, `ministry_activities`, `practicum_evaluations`, `mentor_assignments`, `formation_entries`.
Research: `research_projects`, `research_submissions`.
Content: `posts` (news/event/announcement/FAQ), `policies` (versioned), `content_blocks`/`content_versions`, `library_resources`, `assets`.
Operations: `notifications`, `email_outbox`, `invoices`, `payments`, `integrity_cases`, `evaluations`, `board_decisions`, `ai_requests`, `settings`, `audit_logs`, `security_events`, `rate_limits`.

Key integrity rules in the database: unique e-mail (case-insensitive), unique certificate/transcript numbers and tokens, one registration per student per offering, one offering per course per semester, **audit log append-only (trigger)**, **published/locked results cannot change except inside an approved amendment (trigger)**, result totals constrained to 0–100. Multi-campus: `campus_id` on offerings, students and applications; programmes/levels/departments are configurable data.

## 4. Workflows

- **Admission**: DRAFT → SUBMITTED → UNDER_REVIEW → (INTERVIEW_REQUIRED) → ACCEPTED / CONDITIONALLY_ACCEPTED / WAITLISTED / REJECTED → offer accepted → registered (student ID created, user becomes STUDENT). Transitions are validated; decisions need a reason and a different permission (`admissions.decide`) from review.
- **Results**: DRAFT → SUBMITTED → REVIEWED → APPROVED → PUBLISHED → LOCKED. Submitter cannot review/approve; reviewer cannot approve. After publication: amendment request → approval by a different person with `grades.amend` → DB-guarded update → audit with old/new/reason/approver.
- **Graduation**: eligibility (courses, credits, CGPA, no outstanding results, practicum hours, research, financial clearance, no open case) → Registrar recommends → Academic Board (another person) approves — eligibility is **re-checked** at approval → graduated (student → alumnus) → certificate issued (only after Board approval).
- **Content**: DRAFT → REVIEW → APPROVED → PUBLISHED → ARCHIVED; without the approving permission a save is held at REVIEW. Policies are versioned; the previous version is kept.

## 5. Grading & academic configuration

Default scale 90–100 A+ 4.0 … 0–44 F 0.0 (spec §18) is stored in settings and editable only with `settings.academic`; every change is validated (contiguous bands 0–100) and audited with before/after. Passing grade point, credit-hour ratio, semesters, min/max credits per semester, repeat policy (latest/highest/all), maximum repeats, standing thresholds, classification bands and default component weights are all settings.

## 6. API (`/api/v1`)

Cookie session or `Authorization: Bearer <session token>`; unsafe cookie-authenticated methods must be same-origin. Responses `{ ok, data }` or `{ ok:false, error:{code,message,fields} }`.

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /health` | none | `ok`/`degraded` only |
| `GET /assets/:id` | public for logo/site images, otherwise session + ownership/permission | private files never reachable by guessing |
| `GET /documents/(certificate\|transcript)/:id` | owner (issued) or `certificates.issue`/`transcripts.issue` | PDF with QR; audited; rate-limited |
| `GET /reports/:name` | `reports.export` + report permission | CSV, formula-injection safe, audited |
| `POST /ai/assist` | student/staff, flag + key required | draft only, logged, rate-limited |
| `GET /cron/maintenance` | `CRON_SECRET` bearer | auto-submits lapsed exams, purges expired rows |

Forms and portals use server actions (same service layer). The public verification page `/verify` (`/verify/:token` for QR) is rate-limited and returns only holder, award, programme, institution, date, status.

## 7. UX map

Public → `/` `/about` `/programmes` `/courses` `/admissions` `/apply` · Student → `/student` (dashboard, courses & registration, lessons, assignments/exams, results & GPA, transcript & certificate, ministry, formation, research, library, hubs) · Faculty → `/teach` (courses, assessments, grading, attendance, results, question bank, mentees) · Admin → `/admin` (dashboard & everything else). Empty, loading (skeleton/spinners, disabled actions) and error states exist throughout; mobile navigation is a drawer; focus rings, labels, skip link, reduced motion and `aria` roles are standard.
