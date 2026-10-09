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
