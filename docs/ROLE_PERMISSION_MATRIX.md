# Role / permission matrix (generated)

Roles are editable by the Super Admin; this is the **default** seed. `Yes` = the permission is granted. Scope rules (lecturer = assigned courses, HOD = department, mentor = assigned students, student = own records) are enforced in services on top of the permission.

| Permission | Founder / President | Chancellor / Principal | Academic Board Member | Registrar | Academic Dean | Head of Department | Examination Officer | Admissions Officer | Student Affairs Officer | Finance Officer | Librarian | Communications Officer | ICT / System Administrator | Lecturer | Adjunct / Visiting Lecturer | Teaching Assistant | Ministry Mentor |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Website & Content** ||||||||||||||||||
| `content.manage` | Yes | Yes |  |  |  |  |  |  |  |  |  | Yes |  |  |  |  |  |
| `content.publish` | Yes | Yes |  |  |  |  |  |  |  |  |  | Yes |  |  |  |  |  |
| `media.manage` | Yes |  |  |  |  |  |  |  |  |  | Yes | Yes | Yes |  |  |  |  |
| **Governance** ||||||||||||||||||
| `policies.manage` | Yes | Yes |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `policies.approve` | Yes | Yes | Yes |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| **People** ||||||||||||||||||
| `users.view` | Yes | Yes |  | Yes |  |  |  |  |  |  |  |  | Yes |  |  |  |  |
| `users.manage` |  |  |  |  |  |  |  |  |  |  |  |  | Yes |  |  |  |  |
| **Students** ||||||||||||||||||
| `students.view` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |  |  |  |  |  |  |  |
| `students.edit` |  |  |  | Yes |  |  |  |  | Yes |  |  |  |  |  |  |  |  |
| `students.status` |  |  |  | Yes |  |  |  |  | Yes |  |  |  |  |  |  |  |  |
| **Faculty** ||||||||||||||||||
| `faculty.view` | Yes | Yes | Yes | Yes | Yes | Yes |  |  |  |  |  |  |  |  |  |  |  |
| `faculty.manage` |  | Yes |  |  | Yes |  |  |  |  |  |  |  |  |  |  |  |  |
| **Admissions** ||||||||||||||||||
| `admissions.view` | Yes | Yes |  | Yes |  |  |  | Yes |  |  |  |  |  |  |  |  |  |
| `admissions.review` |  |  |  |  |  |  |  | Yes |  |  |  |  |  |  |  |  |  |
| `admissions.decide` |  | Yes |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `admissions.register` |  |  |  | Yes |  |  |  |  |  |  |  |  |  |  |  |  |  |
| **Curriculum** ||||||||||||||||||
| `programmes.manage` |  | Yes | Yes |  | Yes |  |  |  |  |  |  |  |  |  |  |  |  |
| `courses.manage` |  | Yes |  |  | Yes | Yes |  |  |  |  |  |  |  |  |  |  |  |
| `curriculum.approve` | Yes | Yes | Yes |  | Yes |  |  |  |  |  |  |  |  |  |  |  |  |
| `calendar.manage` |  | Yes |  | Yes | Yes |  |  |  |  |  |  |  |  |  |  |  |  |
| `offerings.manage` |  | Yes |  | Yes | Yes |  |  |  |  |  |  |  |  |  |  |  |  |
| **Registrar** ||||||||||||||||||
| `registration.manage` |  |  |  | Yes |  |  |  |  |  |  |  |  |  |  |  |  |  |
| **Teaching** ||||||||||||||||||
| `teaching.own` |  |  |  |  |  | Yes |  |  |  |  |  |  |  | Yes | Yes | Yes |  |
| `teaching.any` |  |  |  | Yes | Yes |  | Yes |  |  |  |  |  |  |  |  |  |  |
| **Examinations** ||||||||||||||||||
| `questions.manage` |  |  |  |  |  |  |  |  |  |  |  |  |  | Yes | Yes |  |  |
| `questions.approve` |  |  |  |  | Yes | Yes | Yes |  |  |  |  |  |  |  |  |  |  |
| `exams.manage` |  |  |  |  |  |  | Yes |  |  |  |  |  |  |  |  |  |  |
| **Results** ||||||||||||||||||
| `grades.enter` |  |  |  |  |  |  |  |  |  |  |  |  |  | Yes | Yes |  |  |
| `grades.review` |  | Yes |  |  | Yes | Yes |  |  |  |  |  |  |  |  |  |  |  |
| `grades.approve` |  | Yes |  | Yes |  |  | Yes |  |  |  |  |  |  |  |  |  |  |
| `grades.amend` |  |  |  | Yes |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `appeals.manage` |  | Yes | Yes | Yes | Yes |  |  |  |  |  |  |  |  |  |  |  |  |
| **Credentials** ||||||||||||||||||
| `transcripts.issue` |  |  |  | Yes |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `graduation.registrar` |  | Yes |  | Yes |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `graduation.board` |  | Yes | Yes |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `certificates.issue` |  |  |  | Yes |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `certificates.revoke` |  |  |  | Yes |  |  |  |  |  |  |  |  |  |  |  |  |  |
| **Ministry Formation** ||||||||||||||||||
| `ministry.view` | Yes | Yes | Yes | Yes | Yes |  |  |  | Yes |  |  |  |  |  |  |  | Yes |
| `ministry.manage` |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `ministry.mentor` |  |  |  |  |  |  |  |  |  |  |  |  |  | Yes |  |  | Yes |
| **Research** ||||||||||||||||||
| `research.manage` |  | Yes |  |  | Yes |  |  |  |  |  |  |  |  |  |  |  |  |
| `research.supervise` |  |  |  |  |  | Yes |  |  |  |  |  |  |  | Yes |  |  |  |
| **Library** ||||||||||||||||||
| `library.manage` |  |  |  |  |  |  |  |  |  |  | Yes |  |  |  |  |  |  |
| **Community** ||||||||||||||||||
| `community.moderate` |  |  |  |  |  |  |  |  | Yes |  |  |  |  |  |  |  |  |
| **Finance** ||||||||||||||||||
| `finance.view` | Yes |  |  |  |  |  |  |  |  | Yes |  |  |  |  |  |  |  |
| `finance.manage` |  |  |  |  |  |  |  |  |  | Yes |  |  |  |  |  |  |  |
| **Integrity & Quality** ||||||||||||||||||
| `integrity.manage` |  |  |  |  |  |  | Yes |  | Yes |  |  |  |  |  |  |  |  |
| `qa.manage` | Yes | Yes | Yes |  | Yes |  |  |  |  |  |  |  |  |  |  |  |  |
| **Communication** ||||||||||||||||||
| `comms.send` | Yes | Yes |  | Yes |  |  |  | Yes | Yes |  |  | Yes |  |  |  |  |  |
| **Reports & Audit** ||||||||||||||||||
| `reports.view` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |  | Yes |  |  |  |  |  |  |  |
| `reports.export` | Yes | Yes |  | Yes | Yes |  |  |  |  |  |  |  |  |  |  |  |  |
| `audit.view` | Yes | Yes |  | Yes |  |  |  |  |  |  |  |  | Yes |  |  |  |  |
| **Configuration** ||||||||||||||||||
| `settings.academic` |  | Yes |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `settings.admissions` |  |  |  |  |  |  |  | Yes |  |  |  |  |  |  |  |  |  |
| `ai.use` |  |  |  |  |  |  |  |  |  |  |  |  |  | Yes | Yes |  |  |

**Super Admin** holds every permission plus `super.roles`, `super.settings`, `super.security`, `super.accounts`, `super.system`, which can never be granted to a role.
