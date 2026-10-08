# Security & RBAC

## Authentication
- Passwords: Argon2id (19 MiB, t=2). Policy: ≥10 chars with letter, number, symbol; common-password and personal-data checks; one reusable password component with show/hide and strength meter.
- Sessions: random 256-bit tokens, only an HMAC hash is stored; `httpOnly`, `Secure`, `SameSite=Lax`, `__Host-` prefix in production; revocable; password change/reset revokes other sessions; role change revokes the user's sessions.
- Lockout after repeated failures (configurable), uniform error messages (no account enumeration), constant-time dummy verification for unknown accounts, login alerts for staff.
- 2FA: TOTP with encrypted secret and 10 hashed one-time recovery codes. **Mandatory for the Super Admin** (setting), optional/required for staff by setting.
- Portals are separated: staff sign in at `/backend`, learners/applicants at `/login`; a staff account cannot sign in at the learner page and vice-versa.
- Super Admin creation: only while none exists, only for the owner e-mail, only with `SETUP_TOKEN` from the server environment. No credentials in source.

## Authorisation
Every page, server action and API route calls the server-side guard. Permissions are granular (see matrix); roles are data and editable only by the Super Admin; `super.*` capabilities can never be assigned to a role. Scope is enforced in services: lecturers act only on their offerings, mentors only on assigned students (and only on reflections students chose to share), students only on their own registrations, results and files. Separation of duties: result submit/review/approve, graduation recommend/approve, transcript approve/issue, amendment request/approve, question author/approver, policy author/approver, ministry activity (cannot verify own).

## Data protection
- Private files (ID documents, submissions, research) are stored privately and served only via `/api/v1/assets/:id` with ownership or staff permission; failed attempts are logged as IDOR attempts.
- Public verification exposes no private data. Spiritual-formation journals are private by default.
- Audit metadata redacts anything resembling credentials. Audit rows never contain reflection text.
- Collect only necessary data; retention/correction/deactivation are handled by administrators with audit.

## Web security
Per-request CSP nonce (`strict-dynamic`), HSTS, `X-Frame-Options: DENY`, nosniff, Referrer-Policy, Permissions-Policy, COOP; same-origin enforcement for cookie-authenticated writes; no HTML injection (content is rendered as React text — Markdown is parsed to elements, never `innerHTML`); parameterised queries only (Drizzle); uploads validated by extension allow-list + magic bytes, size limits, macro/script/executable/zip-bomb rejection; Postgres-backed rate limits on login, registration, reset, MFA, uploads, verification, contact, exports, AI and exam autosave.

## Audit
`audit_logs` is append-only (DB trigger rejects UPDATE/DELETE). Records: actor, action, entity, summary, metadata (previous/new values, reason, approver), IP, user agent, time. `security_events` records failed logins, lockouts, privilege-escalation and IDOR attempts, suspicious exam activity and abusive verification.

## Exams
Server clock, attempt limits, randomised pools, option shuffling, immutable question snapshot (answer keys never sent to the browser), autosave, auto-submit at the deadline (also by cron), activity events (tab hidden, blur, paste) **recorded for human review — the platform does not claim to prevent cheating or to proctor**.

See [ROLE_PERMISSION_MATRIX.md](ROLE_PERMISSION_MATRIX.md) for the default role/permission matrix.
