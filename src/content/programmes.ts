/**
 * Programme catalogue (spec §11–14, §99). Levels, departments and programmes are data, so new higher
 * programmes (and new departments) can be added from the Admin area without a code change.
 */
import { COURSES_A } from "./courses-a";
import { COURSES_B } from "./courses-b";

export const ALL_COURSES = [...COURSES_A, ...COURSES_B];

export const DEPARTMENTS: { code: string; name: string; description: string }[] = [
  { code: "CFN", name: "Christian Foundations", description: "Entry-level formation in the faith, prayer, character, discipleship and ministry." },
  { code: "BIB", name: "Biblical Studies", description: "Study of the Old and New Testaments, interpretation and biblical theology." },
  { code: "THE", name: "Theology", description: "Systematic, historical, ethical and contextual theology." },
  { code: "MIN", name: "Christian Ministry and Pastoral Studies", description: "Pastoral care, preaching, worship, administration, counselling foundations and practicum." },
  { code: "LDR", name: "Christian Leadership", description: "Servant leadership, management, governance, strategy and succession." },
  { code: "EVM", name: "Evangelism and Missions", description: "Evangelism, apologetics, cross-cultural mission and church planting." },
  { code: "FIV", name: "Fivefold Ministry", description: "The Fivefold Ministry Development Framework: apostolic, prophetic, evangelistic, pastoral and teaching studies." },
  { code: "LAN", name: "Biblical Languages", description: "Biblical Hebrew and Koine Greek." },
  { code: "EDU", name: "Christian Education", description: "Teaching methods and curriculum design." },
  { code: "RES", name: "Research and Scholarship", description: "Academic writing, integrity, research methods and the capstone project." },
  { code: "TEC", name: "Technology Hub", description: "Digital skills for ministry and livelihood: literacy, security, media, AI, web, records and digital income." },
  { code: "KWE", name: "Kingdom Enterprise and Financial Stewardship", description: "Biblical stewardship, personal finance, tent-making, enterprise, bookkeeping, agribusiness and ministry finance for financial independence." },
];

export const LEVELS = [
  { key: "CERTIFICATE", name: "Certificate", rank: 1, description: "Level 1 — foundations." },
  { key: "DIPLOMA", name: "Diploma", rank: 2, description: "Level 2 — ministry and theological competence." },
  { key: "ADVANCED_DIPLOMA", name: "Advanced Diploma", rank: 3, description: "Level 3 — advanced study, research and leadership." },
];

export interface ProgrammeSeed {
  code: string;
  slug: string;
  name: string;
  level: "CERTIFICATE" | "DIPLOMA" | "ADVANCED_DIPLOMA";
  dept: string;
  months: number;
  minCgpa: number;
  practicumHours: number;
  research: boolean;
  description: string;
  objectives: string[];
  outcomes: string[];
  core: string[];
  electives: string[];
  practical?: string;
}

const T = (a: string) => a; // readability marker

export const PROGRAMMES: ProgrammeSeed[] = [
  // ----------------------------------------------------------------- Certificates
  { code: "CCF", slug: "certificate-christian-foundations", name: "Certificate in Christian Foundations", level: "CERTIFICATE", dept: "CFN", months: 6, minCgpa: 1.0, practicumHours: 0, research: false,
    description: "A first step for every believer: the faith, the Bible, doctrine, prayer, character, discipleship, evangelism and ministry in one clear programme.",
    objectives: ["Establish new and growing believers on a sound biblical foundation.", "Develop a personal rhythm of prayer and Bible study.", "Prepare students to disciple and witness."],
    outcomes: ["Explain the Gospel and core doctrines from Scripture.", "Maintain personal spiritual disciplines.", "Share their faith and mentor a new believer."],
    core: ["CFN101", "CFN102", "THE101", "CFN103", "CFN104", "CFN105", "CFN106", "CFN107"], electives: ["BIB101", "TEC101", "KWE101"] },
  { code: "CBS", slug: "certificate-biblical-studies", name: "Certificate in Biblical Studies", level: "CERTIFICATE", dept: "BIB", months: 6, minCgpa: 1.0, practicumHours: 0, research: false,
    description: "A structured entry to Bible study: how the Bible came to us, its two Testaments, major themes, biblical theology and reliable study methods.",
    objectives: ["Give a working knowledge of the Bible.", "Teach reliable methods of study and interpretation."],
    outcomes: ["Survey every book of the Bible.", "Apply basic interpretation principles.", "Lead a Bible study."],
    core: ["BIB101", "BIB102", "BIB103", "BIB107", "BIB105", "BIB106", "BIB104"], electives: ["THE101", "CFN103", "TEC101"] },
  { code: "CCM", slug: "certificate-christian-ministry", name: "Certificate in Christian Ministry", level: "CERTIFICATE", dept: "MIN", months: 9, minCgpa: 1.0, practicumHours: 40, research: false,
    description: "Practical foundations for serving in church and community: ministry, leadership, evangelism, discipleship, pastoral care, prayer ministry, ethics and supervised practice.",
    objectives: ["Prepare students for faithful ministry service.", "Combine learning with supervised practice."],
    outcomes: ["Serve in a local ministry with competence and integrity.", "Apply ministry ethics and safeguarding.", "Reflect on practice with a mentor."],
    core: ["MIN101", "LDR101", "EVM101", "CFN105", "MIN102", "MIN103", "MIN104", "MIN105"], electives: ["BIB104", "TEC101", "KWE103"], practical: "40 verified practicum hours and a mentor-signed evaluation." },
  { code: "CFM", slug: "certificate-fivefold-ministry-foundations", name: "Certificate in Fivefold Ministry Foundations", level: "CERTIFICATE", dept: "FIV", months: 9, minCgpa: 1.0, practicumHours: 20, research: false,
    description: "The biblical foundation of the fivefold ministry — apostle, prophet, evangelist, pastor and teacher — taught as functions for equipping the Body, with character, accountability and team ministry.",
    objectives: ["Teach the fivefold ministry biblically and responsibly.", "Form character and accountability alongside knowledge."],
    outcomes: ["Explain Ephesians 4:11–13 and each function.", "Evaluate calling with Scripture and community.", "Work in teams that value every function."],
    core: ["FIV101", "FIV102", "FIV103", "FIV104", "FIV105", "FIV106", "FIV107", "FIV108", "FIV109"], electives: ["CFN107", "BIB107"], practical: "20 verified practicum hours." },
  { code: "CKE", slug: "certificate-kingdom-enterprise", name: "Certificate in Kingdom Enterprise and Financial Stewardship", level: "CERTIFICATE", dept: "KWE", months: 6, minCgpa: 1.0, practicumHours: 0, research: false,
    description: "Skills for financial independence in ministry: a biblical view of money and work, personal finance, tent-making, entrepreneurship, bookkeeping and basic digital skills.",
    objectives: ["Equip ministers to earn honestly and steward well.", "Reduce financial dependence on offerings and tithes."],
    outcomes: ["Keep a budget and records.", "Plan a small business or bi-vocational model.", "Practise integrity in money matters."],
    core: ["KWE101", "KWE102", "KWE103", "KWE104", "KWE201", "TEC101", "TEC204"], electives: ["KWE204", "KWE205", "TEC206"] },
  { code: "CDM", slug: "certificate-digital-ministry-technology", name: "Certificate in Digital Ministry and Technology", level: "CERTIFICATE", dept: "TEC", months: 6, minCgpa: 1.0, practicumHours: 0, research: false,
    description: "Technology Hub core: digital literacy, cyber-safety, church media, content creation, spreadsheets, responsible AI and online outreach.",
    objectives: ["Make ministers confident and safe with technology.", "Open digital routes to ministry and income."],
    outcomes: ["Use common tools with confidence.", "Run a simple livestream and publish content.", "Use AI responsibly and protect data."],
    core: ["TEC101", "TEC102", "TEC103", "TEC104", "TEC204", "TEC201", "TEC205"], electives: ["TEC202", "TEC203", "TEC206"] },

  // -------------------------------------------------------------------- Diplomas
  { code: "DCM", slug: "diploma-christian-ministry", name: "Diploma in Christian Ministry", level: "DIPLOMA", dept: "MIN", months: 24, minCgpa: 1.5, practicumHours: 120, research: false,
    description: "A broad ministry diploma: interpretation, theology, church history, preaching, church administration, family and counselling foundations, leadership, evangelism, finance and supervised practice.",
    objectives: ["Prepare competent, character-formed ministers.", "Integrate theology with practice."],
    outcomes: ["Preach and teach faithfully.", "Administer a ministry with accountability.", "Care for people with wisdom and know when to refer."],
    core: ["BIB208", "THE201", "THE202", "THE203", "MIN201", "MIN203", "MIN205", "LDR201", "EVM201", "RES101", "KWE202", "MIN105"], electives: ["MIN202", "MIN204", "TEC201", "TEC205", "HEB101", "GRK101", "KWE205"], practical: "120 verified practicum hours." },
  { code: "DBS", slug: "diploma-biblical-studies", name: "Diploma in Biblical Studies", level: "DIPLOMA", dept: "BIB", months: 24, minCgpa: 1.5, practicumHours: 40, research: false,
    description: "Deep, book-by-book study of Scripture with interpretive method, theology and teaching skills.",
    objectives: ["Develop strong biblical knowledge and interpretive skill.", "Prepare Bible teachers."],
    outcomes: ["Interpret every genre responsibly.", "Teach a book of the Bible.", "Write a referenced exegetical paper."],
    core: ["BIB201", "BIB202", "BIB203", "BIB204", "BIB205", "BIB206", "BIB207", "BIB208", "THE201", "RES101", "EDU201"], electives: ["HEB101", "GRK101", "HEB102", "GRK102", "TEC201"], practical: "40 verified teaching practicum hours." },
  { code: "DPM", slug: "diploma-pastoral-ministry", name: "Diploma in Pastoral Ministry", level: "DIPLOMA", dept: "MIN", months: 24, minCgpa: 1.5, practicumHours: 160, research: false,
    description: "Shepherding God's people: preaching, pastoral care, counselling foundations, church administration and personal financial wisdom for pastors.",
    objectives: ["Prepare pastors with a shepherd's heart and administrative competence.", "Provide supervised pastoral practice."],
    outcomes: ["Preach, visit and counsel with competence.", "Run congregational care and administration.", "Manage personal and ministry finances with integrity."],
    core: ["BIB208", "THE201", "THE202", "MIN201", "MIN203", "MIN205", "FIV204", "LDR201", "KWE202", "KWE102", "MIN105", "RES101"], electives: ["MIN202", "MIN204", "TEC203", "TEC102"], practical: "160 verified pastoral practicum hours." },
  { code: "DEM", slug: "diploma-evangelism-missions", name: "Diploma in Evangelism and Missions", level: "DIPLOMA", dept: "EVM", months: 24, minCgpa: 1.5, practicumHours: 160, research: false,
    description: "Evangelism, apologetics, cross-cultural mission, church planting and digital outreach with fieldwork.",
    objectives: ["Prepare evangelists, missionaries and church planters."],
    outcomes: ["Plan and lead outreach with follow-up.", "Communicate across cultures.", "Plant and nurture a new congregation or group."],
    core: ["EVM201", "EVM202", "EVM203", "EVM204", "EVM205", "FIV203", "BIB208", "THE203", "THE204", "RES101", "MIN105", "TEC205"], electives: ["KWE103", "TEC206", "HEB101", "GRK101"], practical: "160 verified outreach and field hours." },
  { code: "DCL", slug: "diploma-christian-leadership", name: "Diploma in Christian Leadership", level: "DIPLOMA", dept: "LDR", months: 24, minCgpa: 1.5, practicumHours: 80, research: false,
    description: "Servant leadership, team building, management, governance, stewardship, finance and technology for leaders.",
    objectives: ["Prepare leaders for churches, ministries and non-profits."],
    outcomes: ["Lead teams and projects.", "Govern with accountability.", "Use financial and digital tools."],
    core: ["LDR201", "LDR202", "LDR203", "MIN203", "MIN201", "BIB208", "THE201", "KWE202", "KWE201", "TEC204", "RES101", "MIN105"], electives: ["TEC203", "KWE104", "EVM201"], practical: "80 verified leadership practicum hours." },
  { code: "DFM", slug: "diploma-fivefold-ministry", name: "Diploma in Fivefold Ministry", level: "DIPLOMA", dept: "FIV", months: 24, minCgpa: 1.5, practicumHours: 120, research: false,
    description: "The integrated Fivefold Ministry Development Framework: apostolic, prophetic, evangelistic, pastoral and teaching studies, church order and mentored formation.",
    objectives: ["Develop ministers who value every function in the Body.", "Form character, discernment and accountability."],
    outcomes: ["Explain and apply each function responsibly.", "Complete a mentored formation reflection.", "Design a team that includes all functions."],
    core: ["FIV201", "FIV202", "FIV203", "FIV204", "FIV205", "FIV206", "FIV207", "BIB208", "THE201", "MIN201", "RES101", "MIN105"], electives: ["TEC205", "KWE103", "KWE202"], practical: "120 verified practicum hours with a ministry mentor." },

  // ------------------------------------------------------------ Advanced Diplomas
  { code: "ADT", slug: "advanced-diploma-theology", name: "Advanced Diploma in Theology", level: "ADVANCED_DIPLOMA", dept: "THE", months: 18, minCgpa: 2.0, practicumHours: 40, research: true,
    description: "Advanced biblical interpretation, theology, ethics and contextual ministry with critical analysis and a research capstone.",
    objectives: ["Develop advanced theological competence.", "Train in research and critical analysis."],
    outcomes: ["Evaluate theological arguments critically.", "Complete a research project and viva.", "Minister contextually in Africa and beyond."],
    core: ["THE301", "THE302", "THE303", "THE305", "BIB301", "BIB303", "BIB304", "RES301", "RES390"], electives: ["HEB301", "GRK301", "LDR301"], practical: "40 verified hours." },
  { code: "ADM", slug: "advanced-diploma-ministry", name: "Advanced Diploma in Ministry", level: "ADVANCED_DIPLOMA", dept: "MIN", months: 18, minCgpa: 2.0, practicumHours: 120, research: true,
    description: "Advanced ministry practice, pastoral theology, strategic leadership, mentoring and mission with a supervised project and research.",
    objectives: ["Prepare senior ministers and ministry leaders."],
    outcomes: ["Lead a ministry initiative.", "Care for people in crisis.", "Plan strategically and mentor successors."],
    core: ["MIN301", "MIN303", "LDR301", "LDR302", "EVM301", "THE303", "BIB301", "RES301", "RES390", "KWE301"], electives: ["EVM302", "THE305", "KWE302"], practical: "120 verified advanced practicum hours." },
  { code: "ADF", slug: "advanced-diploma-fivefold-ministry", name: "Advanced Diploma in Fivefold Ministry", level: "ADVANCED_DIPLOMA", dept: "FIV", months: 18, minCgpa: 2.0, practicumHours: 120, research: true,
    description: "Advanced apostolic, prophetic and integrated fivefold study with exegesis of Ephesians, advanced theology, leadership and a capstone practicum.",
    objectives: ["Prepare mature ministers for responsible, accountable fivefold ministry."],
    outcomes: ["Exegete Ephesians 4 in depth.", "Design church policies on the prophetic and on team ministry.", "Complete a capstone and research project."],
    core: ["FIV301", "FIV302", "FIV304", "BIB302", "THE301", "LDR301", "THE303", "RES301", "RES390", "KWE301"], electives: ["EVM301", "THE305"], practical: "120 verified capstone hours." },
  { code: "ADB", slug: "advanced-diploma-biblical-studies", name: "Advanced Diploma in Biblical Studies", level: "ADVANCED_DIPLOMA", dept: "BIB", months: 18, minCgpa: 2.0, practicumHours: 40, research: true,
    description: "Advanced exegesis, biblical theology of the kingdom, messianic prophecy, Ephesians, historical theology and research.",
    objectives: ["Develop advanced exegetical and biblical-theological skill."],
    outcomes: ["Produce full exegesis.", "Trace major biblical themes critically.", "Complete original research."],
    core: ["BIB301", "BIB302", "BIB303", "BIB304", "THE302", "THE303", "RES301", "RES390"], electives: ["HEB301", "GRK301", "THE305"], practical: "40 verified teaching hours." },
];

export const ADMISSION_BY_LEVEL: Record<string, string[]> = {
  CERTIFICATE: ["A personal profession of faith in Jesus Christ", "Ability to read and write in English (or the language of instruction)", "A reference from a church or ministry leader", "Completed application with identification"],
  DIPLOMA: ["Relevant secondary education or an approved equivalent", "A personal profession of faith and active church involvement", "A reference from a church or ministry leader", "Personal statement; interview where required"],
  ADVANCED_DIPLOMA: ["A Diploma from FCGBS, or relevant prior theological or ministry education or an approved equivalent", "Evidence of ministry experience", "Two references", "Personal statement and research interest; interview required"],
};

export const GRADUATION_BY_LEVEL = (minCredits: number, hours: number, research: boolean, cgpa: number) => [
  `Completion of all required courses (minimum ${minCredits} credit units)`,
  `Minimum CGPA of ${cgpa.toFixed(1)}`,
  ...(hours ? [`${hours} verified ministry practicum hours`] : []),
  ...(research ? ["An approved research project / capstone"] : []),
  "Financial and administrative clearance; no open disciplinary case",
  "Registrar recommendation and Academic Board approval",
];

export const ASSESSMENT_NOTE =
  "Courses are assessed by assignments, tests and a final examination (weights are set per course); practical courses are assessed through supervised practice. Results follow Draft → Submitted → Reviewed → Approved → Published → Locked.";

export const RECOGNITION_NOTE =
  "Institutional programme of Fodan Christian Global Bible School. No external accreditation or government recognition is claimed unless and until it is published by the institution.";

void T;
