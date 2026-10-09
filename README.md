# Fodan Christian Global Bible School (FCGBS)

**Rightly dividing the Word. Raising Kingdom ministers.** — the digital institution of Fodan Christian Global Bible School, operating within the vision of **Fodan Gospel Outreach** (Founder & President: Banjo Folahan Daniel; sponsor: The Living Youth International).

One platform for the whole lifecycle: **Visitor → Applicant → Admitted → Student → Graduate → Alumnus**, with public website, admissions, student portal, lecturer portal, administration, examinations, results, GPA/CGPA, ministry formation, research, library, transcripts, QR-verifiable certificates, audit and reporting.

It is built to be **fast and light**: server-rendered pages, one small web font, no heavy client libraries, charts-free tables, text-first lessons, cached static assets, PWA manifest, and a service worker for repeat visits.

## What is inside

| Area | Highlights |
|---|---|
| **Public website** | Home with animated announcement carousel, About, Vision/Mission/Values, Statement of Faith (versioned), Founder & Leadership, Programmes (16), Courses (114), Departments, Admissions & How to apply, Faculty, Ministry Formation, Fivefold Ministry framework, **Technology Hub**, **Kingdom Enterprise & Financial Stewardship**, Library, News & Events, FAQs, Contact, Certificate Verification. Everything is editable from the backend. |
| **Programmes** | Certificate (6) → Diploma (6) → Advanced Diploma (4), levels and departments are data — add higher programmes without code. Every programme: description, objectives, outcomes, admission/graduation requirements, structure by year/semester, credits, electives, practicum, assessment. |
| **Curriculum content** | 114 courses with objectives, outcomes, syllabus, reading lists (real published works, cited — never reproduced), assessment weights, prerequisites; generated course guides and ~14 complete flagship lessons (Fivefold, Prophetic testing, Prayer, Ministry ethics, Hermeneutics, Academic integrity & AI, Hebrew/Greek starters, Tech, Money & work, Budgeting, Tent-making). Lecturers and admins add more. |
| **Technology Hub & Kingdom Enterprise** | Digital literacy, cyber-safety, church media, content creation, responsible AI, no-code websites, records & data protection, digital income; biblical stewardship, personal finance, tent-making ministry, entrepreneurship, bookkeeping, ministry finance & compliance, investment & fraud awareness, agribusiness, vocational skills, funding the vision, legacy. |
| **Admissions** | Applicant account → application (personal, education, ministry, references, statement) → documents → submit → review → interview → decision (with reasons) → offer → acceptance → registration → student ID. |
| **Learning** | Registration with prerequisite / co-requisite / credit-limit / capacity / window checks, repeats, exemptions and transfer credit; modules & lessons (Markdown, video/audio links), progress, attendance, assignments with AI-use disclosure and late policy, auto-marked timed examinations (random pools, shuffled options, server clock, autosave, activity log). |
| **Results** | Draft → Submitted → Reviewed → Approved → Published → Locked. Separation of duties (submitter ≠ reviewer ≠ approver). Published results cannot change except by an approved **amendment** (DB-enforced). GPA, semester GPA, CGPA, standing, classification calculated server-side. Appeals. |
| **Credentials** | Graduation eligibility (8 checks) → Registrar → Academic Board (different person) → Graduated → Certificate (PDF, QR, number, token) / Transcript (draft → approved → issued by a second person). Public verification shows only holder, award, programme, institution, date, status. Revocation and supersession. |
| **Ministry & spiritual formation** | Placements, practicum hours (verified by mentors), supervisor/final evaluation (qualitative competency levels, no spiritual score), private reflective journal with opt-in sharing to an assigned mentor. Fivefold Ministry framework teaches functions — **it never declares anyone an apostle, prophet, evangelist, pastor or teacher**. |
| **Research** | Topic → proposal → supervision & feedback → final → viva → assessment → approval → archive. |
| **Administration** | Super Admin & assigned admins: content, branding (logo/pictures), settings (grading, credits, standing, admissions…), generic CRUD for programmes/courses/departments/calendar/offerings/news/library/campuses, staff & roles (granular RBAC), finance, integrity cases, versioned policies, audit log, reports with CSV export, permission-aware global search. |
| **Security** | Argon2id, hashed sessions, lockout, rate limits (Postgres), TOTP 2FA + recovery codes, CSRF/same-origin, per-request CSP nonce, secure headers, upload sniffing (macro/script/zip-bomb), private files behind authorisation, append-only audit log, no secrets in client code. |

## Quick start (local)

Requires Node 20.9+.

```bash
npm install
cp .env.example .env.local        # fill AUTH_SECRET, ENCRYPTION_KEY, SETUP_TOKEN
npm run db:local                  # terminal 1 — local PostgreSQL (PGlite) on 127.0.0.1:5433
npm run db:migrate                # terminal 2
npm run db:seed                   # roles, departments, 114 courses, 16 programmes, policies, library
npm run dev                       # http://localhost:3000
```

Open `/backend`: while no Super Admin exists it shows **first-time setup**. Enter the owner e-mail (default `folahandaniel@gmail.com`, override with `SUPERADMIN_EMAIL`), the `SETUP_TOKEN` as setup key and a strong password, then enrol 2FA. Nothing is hard-coded.

Generate secrets: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.

## Commands

| Command | Purpose |
|---|---|
| `npm run verify` | lint + typecheck + tests + production build |
| `npm test` | 30+ unit & integration tests on a real PostgreSQL engine (PGlite), including the full applicant → graduate → certificate → public-verification lifecycle |
| `npm run db:generate` | create a migration from schema changes (never edit production schemas by hand) |
| `npm run brand:assets` | rebuild favicon / PWA icons / PDF logo from `assets-source/image1.png` |
| `npx tsx scripts/docs-matrix.ts` | regenerate `docs/ROLE_PERMISSION_MATRIX.md` |

## Documentation

- [Architecture, database & API](docs/ARCHITECTURE.md)
- [Security & RBAC](docs/SECURITY_AND_RBAC.md) · [Role/permission matrix](docs/ROLE_PERMISSION_MATRIX.md)
- [Operations: deployment, environment, backup, monitoring](docs/OPERATIONS.md)
- [Administrator, faculty and student guides](docs/GUIDES.md)
- [Assumptions, honest status & what the institution must supply](docs/ASSUMPTIONS.md)

## Important honesty notes

- **No accreditation or recognition is claimed.** Programmes are presented as institutional theological education programmes until the institution publishes verified recognition (Admin → Programmes → Recognition statement).
- **No fake data.** There are no invented testimonials, statistics, faculty qualifications, partners or campuses. Leadership slots other than the Founder are labelled placeholders to be completed.
- **E-mail** is queued and shown as *held* unless `RESEND_API_KEY` is set — never falsely "sent". **Online payments** are prepared but off; Finance records payments manually. **Exam integrity** features are session timing, randomisation, attempt limits and *activity logging for human review* — the system does not claim proctoring.
- Library listings are **citation-only** unless the Librarian confirms the school holds distribution rights.


## 2026 upgrade
See [docs/UPGRADE_2026.md](docs/UPGRADE_2026.md): Bible Hub with concordance and Hebrew/Greek, the Teaching Library, DOCX/PPTX/PDF exports, and the access-code system.
