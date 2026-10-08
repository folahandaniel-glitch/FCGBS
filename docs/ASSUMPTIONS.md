# Assumptions, honest status and what the institution must supply

## Configurable defaults chosen (all editable in Admin → Settings)
Grading scale per spec §18; pass at grade point ≥ 1.0; 15 contact hours per credit; 2 semesters per session; 6–24 credits per semester; repeats counted by latest attempt, max 2 repeats; standing: warning < 2.0, probation < 1.5, suspension < 1.0 (judged after 12 graded credits); classification Distinction ≥ 3.5 / Credit ≥ 3.0 / Merit ≥ 2.0 / Pass ≥ 1.0; transfer/exemption ≤ 50 % of a programme; default weights 20/20/60; student ID format `FCGBS/YYYY/NNNN`; certificate number `FCGBS-CERT-YYYY-NNNN`; session 24 h (learners) / 8 h (staff); Super Admin 2FA mandatory.

## Content provenance
All curriculum text, lessons, policies and website copy were written for this project (no copying). Scripture quotations are KJV (public domain) or paraphrase. Reading lists cite real, published works so students can obtain them lawfully; **no copyrighted book is reproduced or distributed**. The Statement of Faith and policies are *drafts for Academic Board review*, written from the supplied outline without inventing denominational doctrine. Financial/legal/tax material (Kingdom Enterprise) is general education and says so; it must be reviewed against current Nigerian law by a qualified professional before being relied on.

## What the institution must supply / decide
Real leadership names and photos; physical address or learning-centre details; accreditation/recognition statements (only if verified); tuition fees; signatory names for certificates; faculty appointments and qualifications; bank/payment instructions; the final Statement of Faith and doctrine ratified by the Academic Board; official letterhead wording; data-retention periods; e-mail provider key.

## Known gaps / next steps (not claimed as done)
- E-mail delivery needs a provider key (Resend supported); until then messages are held in the outbox.
- Online payment gateway not integrated (invoices and manual payment recording are complete).
- Excel (.xlsx) export: CSV and print-friendly pages are provided (CSV opens in Excel). PDF is provided for transcripts and certificates.
- Discussion/community tables (reporting, blocking, moderation) exist in the schema; the UI is not yet built.
- Alumni profile pages, continuing-education/short-course modules, hostel/transport/donations are architecturally supported (`alumni_profiles`, flags) but not built — by design (spec §120–121).
- Browser-level automated tests (Playwright, axe) and load testing have not been run; unit/integration tests (32+) cover authentication, RBAC separation of duties, admissions, registration rules, assessments and exams, results workflow, amendments, GPA/CGPA, graduation, certificates, verification, transcripts, content versioning, policies and permission-aware search.
- Seed data is **structural only** (roles, departments, courses, programmes, policies, library citations). No demo people or results are seeded into any environment.
