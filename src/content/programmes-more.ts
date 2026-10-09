import type { ProgrammeSeed } from "./programmes";

/**
 * Programmes added in the 2026 upgrade, and the elective placements of the new courses in existing programmes.
 * New courses are linked to existing programmes only when the course is first created, so later edits by the
 * Academic Board (removing or moving an elective) are never undone by a deployment.
 */
export const NEW_PROGRAMMES: ProgrammeSeed[] = [
  { code: "CAT", slug: "certificate-apostolic-pastoral-evangelical-prophetic-teaching", name: "Certificate in Apostolic, Pastoral, Evangelical and Prophetic Teaching", level: "CERTIFICATE", dept: "FIV", months: 12, minCgpa: 1.0, practicumHours: 20, research: false,
    description: "A focused certificate on the four teaching streams of the Fivefold framework: the apostles' doctrine and sent ministry, shepherding and pastoral care, the gospel and evangelism, and prophecy tested by Scripture, with foundations in the Word and the Spirit.",
    objectives: ["Teach each of the four streams faithfully from Scripture.", "Form humble, accountable and mission-minded ministers.", "Equip students to lead teaching in local churches."],
    outcomes: ["Explain apostolic doctrine, pastoral care, evangelism and prophecy from the Bible.", "Apply safeguards for authority, accountability and testing.", "Prepare and deliver lessons in each stream."],
    core: ["FIV102", "FIV103", "FIV104", "FIV105", "FIV210", "FIV211", "FIV212", "FIV213", "CFN102"], electives: ["THE206", "THE207", "LAN101"], practical: "20 verified practicum hours teaching or serving under a mentor." },
  { code: "CRR", slug: "certificate-revival-reformation-studies", name: "Certificate in Revival and Reformation Studies", level: "CERTIFICATE", dept: "THE", months: 9, minCgpa: 1.0, practicumHours: 0, research: false,
    description: "The biblical pattern and the history of revival and reformation, from Hezekiah and Josiah to the Reformation, the awakenings and the revivals of Africa and Asia, with practical preparation for renewal in the church.",
    objectives: ["Teach the biblical and historical patterns of revival and reformation.", "Prepare churches to seek renewal in a biblical and orderly way."],
    outcomes: ["Describe key revivals and their lessons.", "Evaluate revival claims with discernment.", "Plan a church programme of prayer and renewal."],
    core: ["THE207", "THE203", "THE204", "THE206", "CFN103", "CFN102"], electives: ["THE212", "THE307", "BIB305"] },
  { code: "CBL", slug: "certificate-biblical-languages-original-language-study", name: "Certificate in Biblical Languages and Original-Language Study", level: "CERTIFICATE", dept: "LAN", months: 9, minCgpa: 1.0, practicumHours: 0, research: false,
    description: "A first programme in Hebrew and Greek for ministers: word-study skills with the Bible Hub, the alphabets and grammar of Biblical Hebrew and Koine Greek, and the careful use of original-language tools in preaching.",
    objectives: ["Equip ministers to use Hebrew and Greek tools responsibly.", "Lay a foundation for further language study."],
    outcomes: ["Read both alphabets and use lexicons and concordances.", "Carry out careful word studies.", "Avoid common exegetical fallacies."],
    core: ["LAN101", "HEB101", "GRK101", "BIB104", "TEC207"], electives: ["BIB209", "HEB102", "GRK102"] },
];

/** Programme code → new courses offered as electives there. */
export const ELECTIVE_ADDITIONS: Record<string, string[]> = {
  CCF: ["KWE207", "LAN101"], CBS: ["LAN101", "BIB209", "BIB210"], CCM: ["MIN206", "MIN209", "TEC207"], CFM: ["FIV210", "FIV211", "FIV212", "FIV213"],
  CKE: ["KWE206", "KWE207"], CDM: ["TEC207", "TEC208", "KWE207"],
  DCM: ["MIN206", "MIN207", "MIN208", "MIN209", "EVM206", "LDR204", "THE206", "THE207", "THE208", "KWE206", "KWE207", "TEC207", "TEC208", "RES202"],
  DBS: ["BIB209", "BIB210", "BIB305", "THE206", "THE207", "LAN101", "TEC207", "RES202"],
  DPM: ["MIN206", "MIN207", "MIN208", "MIN209", "LDR204", "FIV211", "THE208"],
  DEM: ["EVM206", "FIV212", "THE207", "TEC208"], DCL: ["LDR204", "KWE206", "KWE207", "THE208"],
  DFM: ["FIV210", "FIV211", "FIV212", "FIV213", "THE206"],
  ADT: ["BIB305", "BIB306", "THE212", "THE307"], ADM: ["THE307", "MIN208", "BIB305", "THE212"], ADF: ["THE307", "THE212"], ADB: ["BIB305", "BIB306", "THE212"],
};
