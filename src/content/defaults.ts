/**
 * Default text for every editable block of the public website (spec: "all frontend content must be editable
 * from the backend"). A Super Admin or an assigned administrator edits these in Admin → Website & Content;
 * stored values are merged over these defaults, so a newly added field always has sensible text.
 *
 * Rules followed here (spec §94, §105): no invented accreditation, partnerships, statistics, testimonials or
 * faculty qualifications. Anything the institution has not supplied is an obvious, editable placeholder.
 */

import { BIBLE_TOPICS, type BibleTopic } from "./bible-topics";
import { BIBLE_PLANS, type ReadingPlan } from "./bible-plans";
import { BIBLE_LANGUAGES } from "./bible-languages";
import { BIBLE_TIMELINE } from "./bible-timeline";

export interface Slide {
  title: string;
  text: string;
  link: string;
  linkLabel: string;
  imageAssetId: string;
}

export const CONTENT_DEFAULTS = {
  nav: {
    items: [
      { label: "About", href: "/about" },
      { label: "Programmes", href: "/programmes" },
      { label: "Courses", href: "/courses" },
      { label: "Admissions", href: "/admissions" },
      { label: "Fivefold Ministry", href: "/fivefold-ministry" },
      { label: "Technology Hub", href: "/technology-hub" },
      { label: "Kingdom Enterprise", href: "/kingdom-enterprise" },
      { label: "Library", href: "/library" },
      { label: "News & Events", href: "/news" },
    ] as { label: string; href: string }[],
  },

  carousel: {
    slides: [
      {
        title: "Admissions are open",
        text: "Begin with a Certificate, grow into a Diploma, and advance to an Advanced Diploma — studied online, at your pace, from anywhere in the world.",
        link: "/admissions",
        linkLabel: "How to apply",
        imageAssetId: "",
      },
      {
        title: "Ministers who are equipped — and free to focus on the work",
        text: "New in every programme: the Technology Hub and Kingdom Enterprise courses, so that ministers can serve without being dependent on offerings and tithes.",
        link: "/technology-hub",
        linkLabel: "Explore the Hubs",
        imageAssetId: "",
      },
      {
        title: "The Fivefold Ministry Development Framework",
        text: "Apostolic, prophetic, evangelistic, pastoral and teaching studies — taught as functions that equip the whole Body of Christ.",
        link: "/fivefold-ministry",
        linkLabel: "See the framework",
        imageAssetId: "",
      },
      {
        title: "Verify a FCGBS certificate",
        text: "Employers, churches and ministries can confirm a certificate in seconds — by number or by scanning its QR code.",
        link: "/verify",
        linkLabel: "Verify now",
        imageAssetId: "",
      },
    ] as Slide[],
  },

  home: {
    eyebrow: "Fodan Christian Global Bible School · FCGBS",
    title: "Rightly dividing the Word of Truth.",
    subtitle:
      "A Christ-centred, Scripture-centred Bible school that joins sound theological education, spiritual formation and practical ministry training — with the Kingdom skills that let ministers serve free from financial pressure.",
    primaryCta: { label: "Apply now", href: "/apply" },
    secondaryCta: { label: "Explore programmes", href: "/programmes" },
    scriptureLine: "“Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth.” — 2 Timothy 2:15",
    audienceTitle: "Who FCGBS serves",
    audience: [
      "Believers who want to know the Bible deeply and live it faithfully",
      "Emerging pastors, teachers, evangelists and missionaries",
      "Ministry leaders who need structured theological foundations",
      "Youth and discipleship leaders serving in churches and communities",
      "Ministers who want a sustainable livelihood alongside ministry",
    ],
    pathwayTitle: "A clear pathway",
    pathwaySubtitle: "Three levels, each building on the one before — with room to add higher programmes as the school grows.",
    equationTitle: "What we form",
    equation: ["Knowledge", "Character", "Spiritual formation", "Ministry competence", "Kingdom service"],
    featuresTitle: "Why FCGBS",
    features: [
      { title: "Scripture at the centre", text: "Every course is built on the authority of the Bible, taught with sound exegesis and clear doctrine." },
      { title: "Formation, not just information", text: "Prayer, mentoring, practicum and reflection sit beside the classroom — without reducing spiritual life to a score." },
      { title: "Fivefold Ministry framework", text: "Apostolic, prophetic, evangelistic, pastoral and teaching studies, taught with character, accountability and church order." },
      { title: "Technology Hub", text: "Digital literacy, media, AI-assisted study, websites and online ministry skills for the modern minister." },
      { title: "Kingdom Enterprise", text: "Biblical stewardship, personal finance, bookkeeping, tent-making and enterprise skills for financial independence." },
      { title: "Built for low data", text: "A light, fast platform that works on a basic phone and a weak connection, with lessons you can read anywhere." },
    ] as { title: string; text: string }[],
    hubTitle: "Equipped to serve. Free to focus.",
    hubText:
      "The Apostle Paul worked with his hands so that the gospel would not be hindered (Acts 18:3; 1 Thessalonians 2:9). FCGBS follows that pattern: ministers who can build honest livelihoods, manage money well and use technology wisely can serve without pressure, protect their integrity and keep their focus on the ministry.",
    ctaTitle: "Begin your training",
    ctaText: "Create an applicant account, choose a programme and submit your application. Your progress is tracked from the first step to graduation.",
  },

  about: {
    title: "About Fodan Christian Global Bible School",
    intro: [
      "Fodan Christian Global Bible School is a Christ-centred theological and ministerial training institution committed to equipping believers with a sound biblical foundation, theological understanding, spiritual maturity and practical ministry competence for effective Kingdom service.",
      "The School exists to make Scripture accessible through structured biblical education, exegetical study, doctrinal formation, ministerial development and Spirit-empowered learning. Our emphasis is not merely on acquiring theological information, but on developing ministers and Christian leaders whose knowledge of the Word produces spiritual depth, godly character, faithful service and a clear understanding of their calling.",
      "The School is built around the conviction that the Church needs ministers who can rightly divide the Word of Truth, faithfully proclaim the Gospel, understand sound doctrine, discern the times and serve God's people with humility and integrity. Through carefully structured courses, biblical research, ministerial training, discipleship and leadership development, FCGBS seeks to prepare students for diverse expressions of Christian service — with Christ as the centre and Scripture as the supreme foundation.",
    ],
    relationshipTitle: "Our relationship with Fodan Gospel Outreach",
    relationship:
      "FCGBS operates within the vision and ministry mandate of Fodan Gospel Outreach and is sponsored in ministry by The Living Youth International. The relationship is one of shared mission and values. Academic administration, student records, financial records and personal data are kept separate from ministry operations and are governed by this school's own policies.",
    recognitionTitle: "An honest statement about recognition",
    recognition:
      "FCGBS programmes are institutional theological education programmes. Unless and until external accreditation or recognition is obtained and published here by the institution, no accreditation, government recognition or partner recognition is claimed.",
  },

  identity: {
    vision:
      "To be a globally accessible Christian theological education institution that equips believers and ministers with sound biblical knowledge, spiritual maturity, practical ministry competence, leadership capacity and Kingdom-oriented character.",
    mission: [
      "Teach the Word of God faithfully.",
      "Equip believers for Christian service.",
      "Develop competent ministers and Christian leaders.",
      "Promote discipleship.",
      "Encourage prayer and spiritual formation.",
      "Equip students for evangelism and missions.",
      "Develop a responsible understanding of the Fivefold Ministry.",
      "Promote biblical and theological scholarship.",
      "Develop Christian character and integrity.",
      "Prepare students for effective Kingdom service.",
      "Make quality theological education digitally accessible.",
      "Encourage lifelong learning and ministry development.",
    ],
    values: [
      "Christ-centeredness", "Biblical fidelity", "Truth", "Faith", "Prayer", "Holiness", "Love", "Help for the less privileged",
      "Spiritual help for falling and failing brethren", "Hope for all", "National peace", "Integrity", "Excellence", "Servanthood",
      "Discipline", "Accountability", "Humility", "Scholarship", "Evangelism", "Missions", "Leadership", "Kingdom service", "Compassion", "Responsibility",
    ],
    emphasis: [
      "Jesus Christ", "Scripture", "The Kingdom of God", "The Great Commission", "Discipleship", "Prayer", "Evangelism", "Missions", "Christian character",
      "Holiness", "Servanthood", "Leadership", "Spiritual maturity", "Biblical literacy", "Theological understanding", "Ministry competence",
      "Responsible spiritual authority", "Accountability", "Excellence", "Global Kingdom impact",
    ],
    philosophy: [
      { title: "Biblical education", text: "The study of Scripture and Christian doctrine." },
      { title: "Theological education", text: "Systematic, historical and practical theology." },
      { title: "Spiritual formation", text: "Prayer, character, discipleship and spiritual maturity." },
      { title: "Ministry formation", text: "Practical ministry development under mentors and supervisors." },
      { title: "Leadership formation", text: "Christian leadership, stewardship and governance." },
      { title: "Missional formation", text: "Evangelism, missions and Kingdom service." },
      { title: "Academic formation", text: "Research, critical thinking, writing and responsible scholarship." },
      { title: "Kingdom wealth for Kingdom advancement", text: "Godly conventional and digital skills so that ministers of God are not dependent on church offerings and tithes." },
    ] as { title: string; text: string }[],
  },

  founder: {
    name: "Banjo Folahan Daniel",
    role: "Founder & President",
    bio: [
      "Banjo Folahan Daniel is an Apostolic Teacher, Christian minister, theologian, researcher, writer and Kingdom-minded communicator with a deep passion for biblical exposition, spiritual formation, discipleship and the equipping of believers for effective Kingdom service. His ministry expression combines apostolic insight with exegetical teaching, prophetic sensitivity, evangelical conviction and sound Christian doctrine. Through teaching, preaching, writing, leadership development and ministerial training, he seeks to communicate Scripture with clarity while helping believers understand not only what the Bible says, but what it means within its biblical, theological and Kingdom context.",
      "His passion for ministry is rooted in the conviction that the Church must be established on the authority of Scripture, formed by the character of Christ, empowered by the Holy Spirit and equipped for faithful service. He has a particular burden for raising spiritually mature Christians, developing emerging ministers, strengthening young people and cultivating teachers who can rightly handle the Word of Truth. Through Fodan Gospel Outreach, The Living Youth International and the Fodan Christian Global Bible School, his vision is to contribute to a generation of biblically grounded, spiritually discerning, intellectually equipped and Kingdom-focused ministers who will faithfully represent Christ and advance His purposes across nations.",
    ],
  },

  leadership: {
    intro: "Titles are configurable and are published here only when the institution confirms them.",
    members: [
      { name: "Banjo Folahan Daniel", title: "Founder & President", bio: "Apostolic Teacher and founder of Fodan Gospel Outreach.", photoAssetId: "" },
      { name: "To be announced", title: "Chancellor / Principal", bio: "Placeholder — to be completed by the institution.", photoAssetId: "" },
      { name: "To be announced", title: "Registrar", bio: "Placeholder — to be completed by the institution.", photoAssetId: "" },
      { name: "To be announced", title: "Academic Dean", bio: "Placeholder — to be completed by the institution.", photoAssetId: "" },
    ] as { name: string; title: string; bio: string; photoAssetId: string }[],
  },

  admissionsPage: {
    title: "Admissions",
    intro: "FCGBS admits believers who are serious about studying the Word and serving faithfully. Applications are reviewed with care, and decisions are made by people — never by software alone.",
    steps: [
      { title: "Create an applicant account", text: "Register with your email address and a strong password." },
      { title: "Choose your programme", text: "Select a Certificate, Diploma or Advanced Diploma that fits your background." },
      { title: "Complete the application", text: "Personal details, education, ministry background, references and a short personal statement." },
      { title: "Upload your documents", text: "Identification, previous qualifications where you have them, and a passport photograph." },
      { title: "Review and decision", text: "The Admissions Office reviews your file, may invite you to an interview, and records a decision." },
      { title: "Accept your offer and register", text: "Accept the offer, and your student account and ID are created." },
    ] as { title: string; text: string }[],
    requirementsNote:
      "Certificate: basic educational and institutional requirements. Diploma: relevant secondary education or an approved equivalent. Advanced Diploma: relevant prior theological or ministry education, or an approved equivalent. Exact requirements for each programme are shown on its page and are set by the Academic Board.",
    feesNote: "Application and tuition fees, where applicable, are published on each programme page and by the Finance Office. FCGBS never asks anyone to pay into an unpublished account.",
  },

  fivefold: {
    title: "The Fivefold Ministry Development Framework",
    intro:
      "“And he gave some, apostles; and some, prophets; and some, evangelists; and some, pastors and teachers; for the perfecting of the saints, for the work of the ministry, for the edifying of the body of Christ: till we all come in the unity of the faith…” — Ephesians 4:11–13",
    principle:
      "At FCGBS the fivefold ministry is taught as five ministry functions that Christ gives to His Church for the maturity and equipping of the whole Body — never as competing titles, rankings or personality types. The School educates, assesses, mentors and forms; it does not declare any student to be an apostle, prophet, evangelist, pastor or teacher. Recognition of ministry remains the responsibility of the appropriate ministry and church processes.",
    functions: [
      { name: "Apostolic Studies", text: "Mission, church planting, leadership, pioneering, organisational development and Kingdom expansion." },
      { name: "Prophetic Studies", text: "Biblical prophecy, prophetic literature, discernment, prophetic ethics, accountability and responsible ministry." },
      { name: "Evangelistic Studies", text: "Evangelism, apologetics, missions, outreach, discipleship and cross-cultural communication." },
      { name: "Pastoral Studies", text: "Pastoral care, shepherding, counselling foundations, preaching, church administration and congregational leadership." },
      { name: "Teaching Studies", text: "Hermeneutics, pedagogy, Bible teaching, theological communication and curriculum development." },
    ] as { name: string; text: string }[],
    foundations: ["Ephesians 4:11–13", "1 Corinthians 12", "Romans 12", "The Acts of the Apostles", "The Pastoral Epistles"],
    topics: ["Biblical understanding of the fivefold ministry", "Calling and character", "Sound doctrine", "Accountability and discernment", "Ministry ethics", "Team ministry and church order", "Responsible prophetic ministry", "Service and discipleship"],
  },

  ministryFormation: {
    title: "Ministry Formation",
    intro:
      "Ministry Formation is the defining feature of FCGBS. Every student has a Ministry Formation Profile — connected to, but separate from, the academic record — where service, practicum, mentoring and reflection are recorded.",
    pillars: [
      { title: "Ministry practicum", text: "Supervised placements in churches, outreaches, missions organisations, schools, media and community projects, with hours, reports and supervisor evaluation." },
      { title: "Mentorship", text: "An assigned ministry mentor who reads what you choose to share, responds with care and evaluates growth." },
      { title: "Spiritual formation", text: "Reflective records of prayer, Bible study, discipleship, fellowship, evangelism, service and character — never reduced to a spiritual score." },
      { title: "Evangelism & missions", text: "Outreach activity, mission exposure and cross-cultural experience recorded and reflected on." },
      { title: "Leadership assignments", text: "Real responsibility with accountability, so that gifts are matched by character." },
      { title: "Ministry ethics", text: "Policies on spiritual abuse, abuse of authority, financial misconduct, safeguarding and confidentiality." },
    ] as { title: string; text: string }[],
    note: "Ministry practicum outcomes are recorded by mentors and the ministry office. The system does not automatically measure or rank anyone's spiritual life.",
  },

  technologyHub: {
    title: "Technology Hub",
    intro:
      "Ministry now happens in the pulpit, on the phone and across the internet. The Technology Hub gives every FCGBS student practical, current digital skills — so that technology becomes a tool for the Gospel and a source of honest income, not a distraction.",
    principles: [
      "Technology serves the mission; it never replaces prayer, presence or pastoral care.",
      "Learn skills that are useful on a basic phone and a weak connection first.",
      "Protect people: privacy, safeguarding and honesty online.",
      "Use artificial intelligence as a servant of study — never as a substitute for Scripture, study or integrity.",
      "Build skills that can also earn a living.",
    ],
    pathways: [
      { title: "Digital foundations", text: "Devices, internet, email, cloud storage, documents and productivity — from absolute beginner." },
      { title: "Cyber-safety & digital security", text: "Passwords, phishing, scams, privacy, safeguarding online and protecting church data." },
      { title: "Church media & live streaming", text: "Audio, camera, lighting and streaming basics that work on a small budget." },
      { title: "Content creation & publishing", text: "Writing, graphics, short video, social media and search visibility for ministry." },
      { title: "AI for study & ministry", text: "Responsible use of AI tools for research orientation, lesson planning and administration — with honest disclosure." },
      { title: "Websites & online presence", text: "Build and manage a website and online giving/communication safely, without writing code." },
      { title: "Spreadsheets & church records", text: "Excel/Sheets, membership records, attendance, budgets and reporting." },
      { title: "Digital income skills", text: "Freelancing, remote work, e-commerce and digital marketing — tent-making for the digital age." },
    ] as { title: string; text: string }[],
    lowData: "Every Hub lesson is text-first, lightweight and readable offline after the first visit. Video is optional and linked, never required.",
  },

  kingdomEnterprise: {
    title: "Kingdom Enterprise & Financial Stewardship",
    intro:
      "“Kingdom Wealth for Kingdom Advancement.” FCGBS trains ministers in godly conventional and digital skills so that ministers of God are not dependent on church offerings and tithes — free to serve with integrity, to speak truth without financial pressure and to help the poor.",
    principles: [
      "Work is honourable and part of God's design (Genesis 2:15; Ephesians 4:28; 2 Thessalonians 3:6–12).",
      "Those who preach the Gospel may live from the Gospel (1 Corinthians 9:14) — and a minister may also choose, like Paul, to work with his own hands (Acts 18:3; 1 Corinthians 9:18).",
      "Money is a servant: earn honestly, give generously, save wisely, avoid debt and fraud.",
      "Never prey on the congregation: transparent church finances and personal accountability.",
      "Wealth is for Kingdom purposes — family, generosity, the poor and the work of God — not display.",
      "Education here is general guidance. It is not personalised financial, legal or tax advice; consult qualified professionals.",
    ],
    pathways: [
      { title: "Biblical foundations of money & work", text: "A theology of work, wealth, poverty, generosity and contentment." },
      { title: "Personal financial management", text: "Budgeting, saving, emergency funds, debt, insurance and pension for ministers and their families." },
      { title: "Tent-making ministry", text: "Bi-vocational models: how to work and minister without compromising either." },
      { title: "Entrepreneurship foundations", text: "Finding needs, validating ideas, pricing, selling and running a small business honestly." },
      { title: "Bookkeeping & basic accounting", text: "Records, cash-flow and simple statements for a business or ministry." },
      { title: "Ministry finance & accountability", text: "Church accounts, offerings, transparency, trustees, compliance and avoiding financial misconduct." },
      { title: "Investment principles & fraud awareness", text: "Savings, cooperatives, agriculture, property and funds — and how to recognise ponzi and advance-fee fraud." },
      { title: "Agribusiness & vocational skills", text: "Practical conventional skills with market value, from farming value-chains to trades and services." },
      { title: "Funding the vision & legacy", text: "Social enterprise, ethical fundraising, partnerships, wills and succession planning." },
    ] as { title: string; text: string }[],
    caution: "FCGBS does not sell investment products, promise returns or recommend that anyone give or invest money with the school or its staff.",
  },

  contact: {
    title: "Contact FCGBS",
    intro: "We would be glad to hear from you. For admissions, academic or technical questions, use the details below or send a message.",
    hours: "Responses are normally given within two working days.",
  },

  library: {
    title: "Digital Library",
    intro: "Study guides, lecture notes, reference materials and curated links for learners. The library respects copyright: files are uploaded only where the school holds the rights; other works are listed with citation and a link to a lawful source.",
  },

  verify: {
    title: "Verify an FCGBS certificate",
    intro: "Enter the certificate number printed on the document, or scan its QR code. We show only what is needed to confirm that the award is genuine — never private student information.",
  },
  bibleTopics: { intro: "Verses gathered by theme. Each reference opens in the Bible reader.", items: BIBLE_TOPICS as BibleTopic[] },
  biblePlans: { intro: "Choose a plan and read at your own pace. Your progress is saved on this device only.", items: BIBLE_PLANS as ReadingPlan[] },
  bibleLanguages: BIBLE_LANGUAGES,
  bibleTimeline: BIBLE_TIMELINE,
} as const;

export type ContentKey = keyof typeof CONTENT_DEFAULTS;

export const CONTENT_LABELS: Record<ContentKey, { label: string; group: string; help: string }> = {
  nav: { label: "Main menu", group: "Site-wide", help: "Public navigation links." },
  carousel: { label: "Homepage carousel (announcements)", group: "Homepage", help: "Animated slides at the top of the homepage. Add announcements, events, images and links." },
  home: { label: "Homepage text", group: "Homepage", help: "Hero, audience, features and call-to-action text." },
  about: { label: "About FCGBS", group: "Institution", help: "About page and relationship with Fodan Gospel Outreach." },
  identity: { label: "Vision, mission, values", group: "Institution", help: "Vision, mission, core values and academic philosophy." },
  founder: { label: "Founder", group: "Institution", help: "Founder biography." },
  leadership: { label: "Leadership", group: "Institution", help: "Leadership team shown on the Leadership page." },
  admissionsPage: { label: "Admissions page", group: "Pages", help: "How to apply, requirements and fees note." },
  fivefold: { label: "Fivefold Ministry page", group: "Pages", help: "Framework text and the five studies." },
  ministryFormation: { label: "Ministry Formation page", group: "Pages", help: "Practicum, mentoring and formation." },
  technologyHub: { label: "Technology Hub page", group: "Pages", help: "Technology Hub introduction and pathways." },
  kingdomEnterprise: { label: "Kingdom Enterprise page", group: "Pages", help: "Financial independence and stewardship pathways." },
  contact: { label: "Contact page", group: "Pages", help: "Contact introduction." },
  library: { label: "Library page", group: "Pages", help: "Library introduction." },
  verify: { label: "Certificate verification page", group: "Pages", help: "Verification introduction." },
  bibleTopics: { label: "Bible topics", group: "Bible & Teaching", help: "Topical Bible study index: add topics and Scripture references." },
  biblePlans: { label: "Bible reading plans", group: "Bible & Teaching", help: "Reading plans: name, days and the books or chapters to read." },
  bibleLanguages: { label: "Hebrew & Greek study", group: "Bible & Teaching", help: "Alphabets, notes and word studies for the languages page." },
  bibleTimeline: { label: "Bible timeline", group: "Bible & Teaching", help: "Genesis-to-Revelation timeline: eras, entries, theology, archaeological evidence and Scripture references." },
};
