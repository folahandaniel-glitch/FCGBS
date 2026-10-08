/**
 * Flagship lesson notes and sample questions. Every course also receives an auto-built "Course guide" lesson
 * from its syllabus (see the seed). All text is original; Scripture is quoted from the KJV (public domain)
 * or paraphrased. Lecturers and administrators can edit, replace or extend every lesson in the backend.
 */
export interface LessonSeed {
  course: string;
  title: string;
  summary: string;
  minutes: number;
  authority?: "INSTITUTIONAL" | "ACADEMIC";
  body: string;
}

export const LESSONS: LessonSeed[] = [
  { course: "FIV101", title: "Gifts for equipping, not for status", summary: "Reading Ephesians 4:7–16 in context.", minutes: 10, authority: "ACADEMIC",
    body: `## The passage
"And he gave some, apostles; and some, prophets; and some, evangelists; and some, pastors and teachers; for the perfecting of the saints, for the work of the ministry, for the edifying of the body of Christ." (Ephesians 4:11–12, KJV)

## Three things to notice
- **Christ is the giver.** The gifts are *given by Christ* (v. 7–8, 11). No one earns or owns them.
- **The purpose is equipping.** The goal is that *all the saints* do the work of ministry. The five functions exist to make the whole Church mature, not to place five people above everyone else.
- **The measure is Christ.** The target is unity of faith and "the measure of the stature of the fulness of Christ" (v. 13) — a picture of character, not of titles.

## Function, not rank
Paul speaks of what Christ gives (gifts), not of positions on a ladder. The same chapter says "there is one body" (v. 4). A healthy church needs apostolic mission, prophetic faithfulness to God's word, evangelistic witness, pastoral care and teaching — and each of these is the responsibility of the whole church, led by those given for that purpose.

## Cautions for the minister
- Do not ask students, or yourself, "Which of the five am I?" as a badge. Ask: "What does Christ want to equip the church for through me, and who confirms it?"
- Recognition belongs to the church and ministry processes. FCGBS teaches and forms; it does not give titles.

## Reflect
1. Why does Paul stress unity in verses 1–6 before he talks about gifts?
2. How could a church misuse these verses to build a hierarchy?
3. Which of the five functions does your church most need, and what would it look like to serve it humbly?` },

  { course: "FIV103", title: "Testing prophecy: a safeguard for the church", summary: "Why testing is commanded, and how.", minutes: 9,
    body: `## Prophecy is encouraged — and tested
"Despise not prophesyings. Prove all things; hold fast that which is good." (1 Thessalonians 5:20–21, KJV)

Both halves matter. Churches that forbid prophecy lose what God gives; churches that never test it are open to deception and abuse.

## Five questions for any prophetic word
- **Scripture:** Does it agree with the revealed Word of God? Nothing may add to or contradict Scripture.
- **Christ:** Does it exalt Jesus and strengthen faith, hope and love? (1 Corinthians 14:3)
- **Fruit:** What is the character of the speaker? (Matthew 7:15–20)
- **Fulfilment:** Where a specific prediction is made, does it come true? (Deuteronomy 18:21–22)
- **Order:** Is it brought in a way that serves the church and can be judged by others? (1 Corinthians 14:29–33)

## Prophetic ethics
- Never charge money for a "word" or link a word to an offering.
- Never use a word to control someone's marriage, money or career decisions.
- Keep confidences; do not announce private matters publicly.
- If a word proves wrong, admit it and say sorry.

## Practice
Write a one-page policy for how prophetic words are received and tested in a church you know.` },

  { course: "TEC101", title: "Getting confident with your phone and the internet", summary: "A practical start, designed for low data.", minutes: 8,
    body: `## Your device is a ministry tool
A smartphone can hold your Bible, notes, contacts, a camera, a library and a classroom. The aim is to use it with confidence and without wasting data.

## Save data
- Turn on **Data Saver** in phone settings.
- Download lessons over Wi-Fi when you can; this platform keeps text light and caches it after your first visit.
- Stop apps from updating over mobile data.
- Watch video only when needed; read the text first.

## The five habits
- **Name and organise files.** Use clear names: "Sermon-2026-03-Romans8.docx".
- **Back up.** Keep important documents in cloud storage and one other place.
- **Use one email address** for school, and keep its password safe.
- **Check before you share.** Ask: Is it true? Is it kind? Is it mine to share?
- **Update.** Install security updates when you are on Wi-Fi.

## Practice
List ten files you would hate to lose. Where are they stored? Make a second copy of three of them today.` },

  { course: "TEC102", title: "Scams, passwords and protecting people", summary: "The ministry's front line of digital safety.", minutes: 9,
    body: `## Why ministers are targets
Ministers hold trust, contact lists and, sometimes, money. Criminals know it.

## Passwords and two-step login
- Use a **long phrase** (four or more random words) rather than a short clever password.
- Use a different password for every important account; keep them in a password manager.
- Turn on **two-step verification** for email and social accounts. Never share the code with anyone — not even someone claiming to be support.

## Common scams
- **Advance-fee** ("send a fee to receive a prize or grant").
- **Impersonation** ("I am your pastor/bishop, buy gift cards urgently").
- **Fake investments** that promise fixed high returns.
- **Phishing** links that imitate banks or social platforms.
Pause, verify by calling a known number, and ask someone you trust.

## Protecting people
- Get permission before posting photos, especially of children.
- Do not publish private prayer requests or counselling details.
- Keep church member lists secure; share only with those who need them.
- Report threats and abuse to the right leaders and authorities.

## Practice
Turn on two-step verification on your email today and write down your recovery options.` },

  { course: "RES101", title: "Academic integrity and responsible AI use at FCGBS", summary: "What is allowed, what must be disclosed, what is never allowed.", minutes: 9, authority: "INSTITUTIONAL",
    body: `## Why integrity matters
A minister's word must be trustworthy. How we handle sources and sums in school forms the habit.

## Offences
- **Plagiarism:** presenting another person's words or ideas as your own.
- **Fabrication:** inventing a source, quotation, statistic or Bible reference.
- **False citation:** citing a source you did not read, or misquoting it.
- **Unauthorised collaboration** and **examination misconduct**.
- **Identity fraud:** someone else doing your work or exam.
- **Unauthorised AI use.**

## AI: what may help
You may use AI tools, where the course allows it, for brainstorming, study planning, explaining a concept, revision questions, orientation to a research topic and language improvement.

## AI: what is never allowed
- Fabricated citations or biblical sources. If an AI gives you a reference, **check it in the real source**.
- Submitting AI-written work as your own where the course forbids it.
- Using AI during an examination, or to impersonate a lecturer or alter a record.

## Disclosure
Where the course requires it, say how you used AI in one or two sentences with your submission. Failing to disclose is itself an integrity matter. AI output is never an official theological authority.

## Process
Reports are investigated fairly, with evidence, a decision, the right of appeal and an audit trail. Students are encouraged to ask a lecturer *before* submitting if they are unsure.` },

  { course: "KWE101", title: "Work, money and the minister: what Scripture says", summary: "A balanced biblical starting point.", minutes: 10,
    body: `## Work is part of God's design
God placed man in the garden "to dress it and to keep it" (Genesis 2:15). Work is not a result of the fall; toil is. Paul tells believers to "work with your hands" (Ephesians 4:28; 1 Thessalonians 4:11) and says that "if any would not work, neither should he eat" (2 Thessalonians 3:10).

## Ministers and money
- "They which preach the gospel should live of the gospel" (1 Corinthians 9:14) — churches should support those who labour in the word (1 Timothy 5:17–18).
- Yet Paul often chose to work as a tent-maker (Acts 18:3; 1 Corinthians 9:15–18) so that the gospel would not be hindered and no one could accuse him of greed.
Both are biblical. The question is wisdom, context and integrity.

## Two errors to avoid
- **Glorifying poverty:** Scripture never praises laziness or lack as holiness, and it commands care for the poor.
- **Merchandising the gospel:** using promises of wealth or miracles to extract money (1 Timothy 6:5–10; 2 Peter 2:3).

## Principles
- Earn honestly. Give generously. Save wisely. Avoid debt traps and schemes.
- Be accountable: let others see how ministry money is handled (2 Corinthians 8:20–21).
- Hold wealth loosely: "Charge them that are rich in this world... that they do good" (1 Timothy 6:17–18).

## Reflect and plan
Write down your sources of income and your giving. What is one honest step toward more independence in the next 90 days?` },

  { course: "KWE102", title: "A simple monthly budget that works", summary: "Four columns and one habit.", minutes: 8,
    body: `*General education only — not personal financial advice. Consult a qualified professional for your situation.*

## Why a budget
A budget is a plan for your money so that it serves your family, your giving and your calling — rather than wondering where it went.

## Four columns
- **Give** — your first, planned generosity.
- **Save** — an emergency fund first (aim for 1–3 months of basic costs, then more).
- **Needs** — food, rent, school fees, transport, data.
- **Wants** — everything else, within what is left.

## The method
- Write down all expected income for the month.
- Allocate every naira (or your currency) to a column until none is left unplanned.
- Track what you actually spend (a notebook or phone app is enough).
- Review weekly for ten minutes; adjust.

## Debt
- List every debt, its balance and its interest rate.
- Pay the minimums; put extra money on one debt at a time.
- Avoid new debt for consumption; be very careful with quick-loan apps that charge heavy fees.

## Practice
Make a budget for next month on one page. Share it with a trusted partner or mentor for accountability.` },

  { course: "KWE103", title: "Tent-making: working without losing the call", summary: "Models and boundaries.", minutes: 8,
    body: `## Paul's pattern
In Corinth Paul worked with Aquila and Priscilla at their trade (Acts 18:1–4). He wrote that he "laboured and travailed night and day" so as not to be a burden (1 Thessalonians 2:9).

## Models today
- **Part-time employee** with flexible hours.
- **Small business owner** who can schedule around ministry.
- **Remote or digital worker** (writing, design, bookkeeping, virtual assistance).
- **Church-supported plus income:** a blend, with transparent arrangements.

## Protect three things
- **Time:** set a weekly rhythm that includes work, ministry, family and rest.
- **Integrity:** be the best worker in your workplace; avoid conflicts of interest.
- **Honesty with your church:** agree expectations openly.

## Questions to ask
- What skills do I already have that people pay for?
- What can I learn in six months with low cost?
- What would a sustainable week look like?

## Practice
Draft a weekly timetable showing work, ministry, family and rest. Review it with your mentor.` },

  { course: "CFN103", title: "A simple pattern for personal prayer", summary: "Learning to pray with Scripture.", minutes: 7,
    body: `## Start where Jesus starts
When His disciples asked, "Lord, teach us to pray," He gave them a pattern (Luke 11:1–4; Matthew 6:9–13). It begins with God — His name, His kingdom, His will — before our needs.

## A pattern you can use in fifteen minutes
- **Adoration:** read a short psalm and praise God for who He is.
- **Confession:** be honest about sin; receive forgiveness (1 John 1:9).
- **Thanksgiving:** name five specific gifts.
- **Supplication:** bring your needs and the needs of others by name.
- **Listening:** be quiet for two minutes; note what Scripture or conscience brings to mind.

## Tips
- Choose a regular time and place.
- Pray out loud or write; both help focus.
- Keep a short list of people to pray for; record answers.
- Do not measure prayer by feeling. Keep going.

## Practice
For one week, pray this pattern each morning and write one sentence afterwards. Share the week's reflection with your mentor if you wish.` },

  { course: "MIN104", title: "Authority is for serving: spotting spiritual abuse", summary: "Ethics every minister must know.", minutes: 9, authority: "INSTITUTIONAL",
    body: `## The model
Jesus said leaders among the Gentiles "lord it over them... But it shall not be so among you" (Mark 10:42–45). Peter tells elders not to be "lords over God's heritage, but being ensamples to the flock" (1 Peter 5:3).

## Warning signs of spiritual abuse
- Using God's name to demand obedience in personal decisions that belong to the person.
- Threatening curses, shame or loss of salvation to silence questions.
- Controlling money, relationships or information.
- Punishing those who raise concerns; secrecy.
- Exploiting people's trust sexually or financially.

## Safeguards
- Plural leadership and written policies.
- Open financial records and independent review.
- Never counsel a person of the opposite sex alone in private; use open, visible settings.
- Report concerns about children and vulnerable adults to the designated safeguarding lead and the authorities.

## Confidentiality
Keep confidences, except where there is a risk of serious harm or a legal duty to report; explain this limit at the start.

## Reflect
Where could your own ministry be tempted to misuse authority? Who has permission to challenge you?` },

  { course: "BIB107", title: "Three questions for every passage", summary: "Context, genre, and what it means for us.", minutes: 8,
    body: `## 1. What did it say, and to whom?
Read the whole chapter and the book. Ask who is speaking, to whom, and why. Context is king: a verse outside its paragraph can be made to say almost anything.

## 2. What kind of writing is it?
- **Narrative:** tells what happened; look for the point of the story.
- **Law:** shows God's holiness and covenant; read it through Christ.
- **Poetry/wisdom:** images and general truths, not promises in every case.
- **Prophecy:** warns and comforts; read in its historical setting.
- **Letters:** written to real churches for real problems.

## 3. What does it mean for us now?
Identify the timeless truth the passage teaches, then apply it with obedience and prayer. Test your application: does it agree with the rest of Scripture and with Christ?

## A quick example: Philippians 4:13
"I can do all things through Christ which strengtheneth me." In context Paul is speaking about contentment in hunger or plenty (v. 11–12), not about guaranteed success in every plan. The truth: Christ strengthens us to endure and to be faithful in any situation.

## Practice
Take Psalm 1 and answer the three questions in a short paragraph each.` },

  { course: "HEB101", title: "Starting with the Hebrew alphabet", summary: "Reading right to left: aleph to tav.", minutes: 9,
    body: `## Reading direction
Hebrew is written and read **right to left**. Books open from what English readers think of as the back.

## The 22 consonants (letter — rough sound)
- א aleph — silent carrier; ב bet — b/v; ג gimel — g; ד dalet — d; ה he — h; ו vav — v/w
- ז zayin — z; ח chet — rough "h"; ט tet — t; י yod — y; כ kaf — k/kh; ל lamed — l
- מ mem — m; נ nun — n; ס samek — s; ע ayin — silent/guttural; פ pe — p/f; צ tsade — ts
- ק qof — q; ר resh — r; ש shin/sin — sh/s; ת tav — t

Five letters change shape at the end of a word (final kaf, mem, nun, pe, tsade).

## Vowels
Early texts were written with consonants only. Later scribes added dots and dashes (vowel points) beneath and above the consonants. In your first weeks, learn the points one family at a time.

## Practice
Copy the alphabet three times, saying each name. Then read the first word of the Bible: בְּרֵאשִׁית (*bereshit*, "in the beginning").

*A beginner course does not make anyone proficient in Hebrew. Use lexicons and commentaries carefully, and avoid claiming skill you have not yet developed.*` },

  { course: "GRK101", title: "Starting with the Greek alphabet", summary: "24 letters, many already familiar.", minutes: 9,
    body: `## The alphabet
Koine Greek, the language of the New Testament, has 24 letters; you may recognise many from mathematics and science.

- α alpha (a), β beta (b), γ gamma (g), δ delta (d), ε epsilon (short e), ζ zeta (z)
- η eta (long e), θ theta (th), ι iota (i), κ kappa (k), λ lambda (l), μ mu (m)
- ν nu (n), ξ xi (x), ο omicron (short o), π pi (p), ρ rho (r), σ/ς sigma (s)
- τ tau (t), υ upsilon (u/y), φ phi (ph), χ chi (kh), ψ psi (ps), ω omega (long o)

## Marks
Words that begin with a vowel carry a **breathing mark** (rough ῾ gives an "h" sound; smooth ᾿ gives none). Accents show stress; at first, learn to see them without worrying.

## Practice
Say the alphabet aloud, then read the words λόγος (*logos*, "word") and ἀγάπη (*agapē*, "love").

*A beginner course does not make anyone proficient in Greek. Be careful with "word studies": a word's meaning depends on its use in context.*` },
];

export interface QuestionSeed {
  course: string;
  stem: string;
  options: string[];
  answer: number;
  explanation?: string;
}

export const QUESTIONS: QuestionSeed[] = [
  { course: "FIV101", stem: "According to Ephesians 4:12, the gifts of Christ are given for…", options: ["Ranking leaders by importance", "Equipping the saints for the work of ministry", "Replacing the local church", "Granting titles"], answer: 1 },
  { course: "FIV101", stem: "Who gives the ministry gifts in Ephesians 4?", options: ["The church board", "The individual", "Christ", "Tradition"], answer: 2 },
  { course: "FIV103", stem: "Which instruction about prophecy appears in 1 Thessalonians 5:20–21?", options: ["Ban all prophecy", "Despise not prophesyings; prove all things", "Believe every prophecy", "Sell prophecy for support"], answer: 1 },
  { course: "FIV103", stem: "A prophetic word that contradicts Scripture should be…", options: ["Obeyed quickly", "Rejected", "Published widely", "Charged for"], answer: 1 },
  { course: "TEC101", stem: "Which habit best protects important documents?", options: ["Keeping a single copy on one phone", "Backing up to cloud storage and a second place", "Emailing them to everyone", "Deleting old files"], answer: 1 },
  { course: "TEC102", stem: "Someone claiming to be your pastor asks you to buy gift cards urgently. What should you do first?", options: ["Buy them at once", "Verify through a known phone number", "Forward the message", "Ignore your bank"], answer: 1 },
  { course: "TEC102", stem: "Which is the safest use of a two-step verification code?", options: ["Share it with support who calls you", "Keep it private to you", "Post it in a group", "Write it on your phone cover"], answer: 1 },
  { course: "RES101", stem: "Which is NOT allowed under FCGBS AI policy?", options: ["Using AI to plan revision", "Submitting an AI-generated citation without checking it", "Asking AI to explain a concept", "Using AI to improve language where permitted"], answer: 1 },
  { course: "RES101", stem: "Fabrication means…", options: ["Quoting with permission", "Inventing a source or quotation", "Summarising a text", "Citing a page"], answer: 1 },
  { course: "KWE101", stem: "Which pair of texts shows both ministers' support and tent-making?", options: ["1 Corinthians 9:14 and Acts 18:3", "Genesis 1:1 and John 3:16", "Psalm 23 and Isaiah 53", "Romans 1 and Jude 1"], answer: 0 },
  { course: "KWE102", stem: "In the simple four-column budget, which is planned first?", options: ["Wants", "Give and Save before Wants", "Debt only", "Nothing"], answer: 1 },
  { course: "CFN103", stem: "In the personal prayer pattern, which comes first?", options: ["Supplication", "Adoration", "Complaint", "Silence"], answer: 1 },
  { course: "MIN104", stem: "A warning sign of spiritual abuse is…", options: ["Open financial records", "Punishing people who raise concerns", "Plural leadership", "Written policies"], answer: 1 },
  { course: "BIB107", stem: "Philippians 4:13 is best understood in the context of…", options: ["Guaranteed success", "Contentment in every situation", "Athletic victory", "Miracle money"], answer: 1 },
  { course: "HEB101", stem: "Hebrew is read…", options: ["Left to right", "Right to left", "Top to bottom", "In any direction"], answer: 1 },
  { course: "GRK101", stem: "The Greek word λόγος (logos) means…", options: ["Love", "Word", "Law", "Light"], answer: 1 },
];
