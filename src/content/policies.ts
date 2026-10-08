/**
 * Initial institutional policies. These are drafts written for the institution to review: the Academic Board
 * (or Founder) publishes the authoritative versions in Admin → Policies, which are versioned and never
 * silently overwritten. Where doctrine is not settled here, the Board configures it (spec §9, §79).
 */
export interface PolicySeed {
  key: string;
  title: string;
  body: string;
}

export const POLICIES: PolicySeed[] = [
  { key: "statement-of-faith", title: "Statement of Faith",
    body: `## Scripture
We believe the Holy Scriptures, the Old and New Testaments, are inspired by God and are the authoritative foundation for Christian faith and life.

## God
We believe in one God, eternally existing as Father, Son and Holy Spirit.

## Jesus Christ
We believe Jesus Christ is Lord and Saviour, fully divine and fully human: His incarnation, sinless life, atoning death, bodily resurrection, ascension, present Lordship and personal return.

## The Holy Spirit
We believe the Holy Spirit indwells, sanctifies, empowers, guides and equips believers.

## Salvation
We believe salvation is through Jesus Christ alone, by grace through faith, and includes repentance, faith, regeneration and new life.

## The Church
We believe the Church is the Body of Christ, called to worship, fellowship, discipleship, service and mission.

## The Kingdom of God
We believe the Kingdom of God is central to the Christian mission and proclamation.

## The Great Commission
We believe the Church is called to make disciples of all nations.

## Resurrection and Christian hope
We believe in the resurrection of the dead and the hope of eternal life with Christ.

## The return of Christ
We believe in the second coming of Christ in glory.

## The Christian life
We believe in holiness, love, faith, prayer, obedience, service, witness and continuing spiritual growth.

## Ministry
We affirm the biblical ministry gifts and functions, with emphasis on character, accountability and service.

*Note: This statement does not introduce denominational doctrines. Matters it does not settle are determined by the Academic Board and published here under version control.*` },

  { key: "academic-integrity", title: "Academic Integrity Policy",
    body: `## Principles
Students are expected to be truthful in all academic work. Dishonesty is incompatible with Christian ministry.

## Offences
Plagiarism; cheating; fabrication; false citation; unauthorised collaboration; examination misconduct; identity fraud; unauthorised use of artificial intelligence.

## Process
- Concerns are recorded as incident reports with evidence.
- The Registrar or a designated officer investigates; the student may respond.
- A decision and sanction are recorded, with the right of appeal to the Academic Board.
- All steps are audited. Sanctions range from a warning or resubmission to failure in a course, suspension or dismissal, proportionate to the offence.

## Support
Students are encouraged to ask their lecturer *before* submitting if they are unsure what is permitted.` },

  { key: "ai-policy", title: "Artificial Intelligence Policy",
    body: `## Permitted uses (where a course allows)
Brainstorming, study planning, explanations, revision, research orientation and language improvement.

## Disclosure
Where a course requires it, students state how AI was used. Failure to disclose is an academic-integrity matter.

## Never permitted
Fabricating citations or biblical sources; generating fake academic records; altering official results; bypassing examinations; impersonating faculty; submitting work automatically without authorisation; manipulating institutional records.

## Authority
AI-generated content is never an official theological authority. It cannot make or recommend final decisions about admissions, dismissal, grades, graduation, certificate revocation or discipline without authorised human review.` },

  { key: "ministry-ethics", title: "Ministry Ethics and Conduct",
    body: `FCGBS students, faculty and staff commit to avoiding: spiritual abuse; abuse of authority; financial misconduct; sexual misconduct; harassment; discrimination; manipulation; false claims about credentials or miracles; academic fraud; examination misconduct. They commit to confidentiality, to declaring conflicts of interest and to accountability.

Concerns may be raised confidentially with the Student Affairs Officer or the Registrar. Retaliation against a person who raises a good-faith concern is itself a serious breach.` },

  { key: "safeguarding", title: "Safeguarding Policy",
    body: `FCGBS is primarily an adult education institution. If minors or vulnerable persons ever participate in school programmes or placements, stronger safeguarding applies: screening of staff and mentors, two-adult supervision, clear reporting routes, immediate referral to the appropriate authorities where required, and restricted access to related records.

Every placement supervisor and mentor agrees to this policy. Any concern must be reported at once to the designated safeguarding lead.` },

  { key: "privacy", title: "Privacy and Data Protection",
    body: `We collect only the information needed to admit, teach, assess and credential students. Sensitive records (identification, documents, academic and ministry records) are restricted by role and never exposed in public URLs. Certificate verification shows only the holder's name, award, programme, institution, date and status.

You may request access to, or correction of, your records through the Registrar. Retention and deletion follow the institution's records policy and applicable law. We do not sell personal data.` },

  { key: "terms", title: "Terms of Use",
    body: `By using this platform you agree to provide accurate information, to protect your account, to follow the Academic Integrity and AI policies, and not to misuse, copy or redistribute course materials without permission. Library resources are provided under their stated access rules and copyright status. The school may suspend accounts that breach these terms, following its published procedure.` },
];

export const FAQS: { q: string; a: string }[] = [
  { q: "Is FCGBS accredited?", a: "FCGBS programmes are institutional theological education programmes. No external accreditation or government recognition is claimed unless and until the institution publishes it on this site." },
  { q: "Can I study entirely online?", a: "Yes. The platform is designed for online and low-data study. Ministry practicum is done in your own local church or approved placement with a supervisor." },
  { q: "Which programme should I start with?", a: "Most applicants begin with a Certificate. A Diploma needs relevant secondary education or an approved equivalent; an Advanced Diploma needs prior theological or ministry education or an approved equivalent." },
  { q: "Will the school tell me I am an apostle, prophet, evangelist, pastor or teacher?", a: "No. FCGBS educates, assesses, mentors and forms. Recognition of ministry remains with the appropriate church and ministry processes." },
  { q: "What is the Technology Hub and Kingdom Enterprise?", a: "They are skill pathways inside the programmes so ministers can build honest livelihoods and use technology wisely. Education only: they are not financial or legal advice." },
  { q: "How do I verify a certificate?", a: "Use the Verify page and enter the certificate number, or scan the QR code printed on the certificate." },
  { q: "Is AI allowed in my coursework?", a: "Only as the course permits, with disclosure where required. AI must never be used to fabricate sources, and it is never an authority on doctrine." },
];
