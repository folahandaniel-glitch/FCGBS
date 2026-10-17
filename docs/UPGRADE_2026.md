# 2026 upgrade: Bible Hub, Teaching Library, Access Codes

## Access codes (cloned from the Fodan College engine)
Nobody except staff can use a learning feature without an active access code.
- Format `FCG-XXXX-XXXX-XXXX` (unambiguous alphabet, ~59 bits). Stored as an HMAC (lookup) and AES-GCM ciphertext (so the Super Admin can re-issue a code). Tables: `access_codes`, `access_periods`, `access_extensions`.
- One code = one account. The clock starts at first activation and is the **server's**. Statuses: UNUSED, ACTIVE, EXPIRED, SUSPENDED, REVOKED (periods also ENDED).
- Features (`src/core/features.ts`): BIBLE, TEACHINGS, COURSES, ASSESSMENTS, RESULTS, LIBRARY, MINISTRY, RESEARCH, HUBS, COMMUNITY. A code opens all of them or a chosen subset. Add a feature by adding it to the registry and guarding the screens.
- Enforcement is on the server: `FeatureGate` layouts for `/bible`, `/teachings` and each student section; `action({ access })` and `api({ access })` guards (learner actions need an active code by default); `/api/v1/bible/*`, `/api/v1/materials/*` and library files check access. Results and records stay readable after a code lapses unless the code never included them. Staff and Super Admin are exempt.
- Admin: **Admin → Access codes** (generate in bulk, CSV batch download, give access to one person, suspend/revoke/restore, adjust a period, choose features, reveal a code — every action audited). Settings → Access codes holds default days, bulk limit and the contact line shown to learners. Permissions: `codes.view`, `codes.generate`, `codes.manage`.
- Learners: a colourful dashboard card with a live countdown, the `/access` page, an optional code field at registration, and a gate screen wherever a feature is closed.

## Bible Hub (`/bible`)
KJV with Strong's numbers (completed word-by-word from the clean 1769 text), BSB, ASV, Hebrew (WLC) and Greek (Textus Receptus); parallel reading; tap a word for its Hebrew/Greek source; concordance with phrase and wildcard search and counts by book; 14,000+ lexicon entries; 30 topics; 10 reading plans (progress stays on the device); Hebrew and Greek alphabets and 50+ word studies; private notes, highlights and bookmarks. Texts live in `data/bible/*.json.gz` (read from disk, held in memory) so the database stays small; rebuild with `node scripts/build-bible-data.mjs`. Topics, plans and language material are editable under Website content. All texts are public domain.

## Teaching Library (`/teachings`)
Eight tracks — Apostolic, Pastoral, Evangelical, Prophetic, Revival & Reformation, Foundations of Faith, Kingdom Enterprise & Stewardship, Technology & Media — with 91 original teachings (about 35,000 words). Admin → Teachings / Teaching tracks / Study materials: add tracks, teachings (Markdown), audio (MP3 upload or link), video links, pictures, and attach Word, PowerPoint, PDF, MP3 or web links to any course or teaching. Every teaching and lesson can be downloaded as **Word, PowerPoint (with speaker notes), PDF or plain text** (generated on demand) and read aloud with the device's own voice (no data used).

## Courses
25 new courses (139 in total) and 3 new programmes; the four teaching streams exist as full courses (FIV210–213) and the revival track as THE207/THE212. Library teachings are also offered as lessons inside the relevant courses (added once by title; lecturer edits are never overwritten).

## Quality guards
`npx tsx scripts/check-quotes.ts` verifies every quotation marked "(Ref, KJV)" against the KJV text; `tests/unit/content.test.ts` checks every Scripture reference, Strong's number and course mapping; `npx vitest run` runs all 44 tests.

## Easy enrolment (self-service)
Register with the basics (name, email, password) and an access code. The code makes the account a student at once, opens every feature the code includes and lets the learner choose **one free certificate programme** (all its core courses open in the current semester automatically). Every other programme or course is a *request*: the learner ticks any number of them in **Programmes and courses**, is told to contact the admin (default 08067578112, editable in Settings → Self-service enrolment) and an administrator with `registration.manage` approves or declines in **Admin → Enrolment requests**. Approval enrols the learner and opens the course. Formal application and admission still work for those who want it. Tables: `enrolment_requests`; services: `src/server/services/selfservice.ts`.

## Ministry update: one code, all courses; Hard Questions; Bible Timeline; exegesis

- **One access code opens every course.** The setting `selfService.openAll` (default on) lets any learner with an active code open a whole programme, selected courses, or *all* courses at once (`/student/courses/start`, `/student/courses/explore`). It applies to existing students automatically, since access is judged by code state. Turn `openAll` off in Admin → Settings → Self-service enrolment to return to approval-by-request (queue at Admin → Requests).
- **Hard Questions** (`/questions`, gated by the QUESTIONS feature of the access code): 33 questions answered through eight lenses (exegetical, genealogical, archaeological, apostolic, prophetic, theological, where Christians differ, pastoral). Content: `src/content/questions/*`; stored in the `hard_questions` table (migration 0005), editable in Admin → Hard Questions. Downloads as DOCX/PPTX/PDF. Every KJV quotation is machine-checked (`npx tsx scripts/check-quotes.ts`).
- **Bible Timeline** (`/bible/timeline`): 32 stops from creation to the new creation with dates (early/late Exodus flagged), theology, graded archaeological evidence (strong / moderate / debated / faith only) and Scripture links. Editable block: Admin → Website content → Bible timeline. Check with `npx tsx scripts/check-timeline.ts`.
- **Exegesis Studies** (teaching track `exegesis`): a method study plus 14 worked passage studies (Genesis, Exodus, Psalm 23, Isaiah 53, Matthew 5, John 1, Romans 3 and 8, Ephesians 2, Philippians 2, Colossians 1, Revelation 1) with Strong's numbers, mapped into BIB107/201/203/204/205/206/207/208/210/301/302/303/304, THE201, HEB301 and GRK301. Strong's ids are verified by `tests/unit/content.test.ts` and listed by `scripts/check-strongs.ts`.
- Fix: the route guard no longer treats `/teachings` as `/teach`.

All new content states where Christians differ and avoids unsupported archaeological claims; add or correct entries in the backend at any time.
