/**
 * Starter study materials: links to the school's own Bible Hub and Teaching Library and to reputable, lawful free resources.
 * Added once (by title and owner) so administrators can edit, replace or remove them in Admin → Study materials.
 * Word, PowerPoint and PDF files are generated for every lesson and teaching on demand; MP3s, PDFs and slide decks can be uploaded in the backend.
 */
export interface MaterialSeed { course?: string[]; teaching?: string[]; title: string; kind: "URL" | "VIDEO" | "PDF" | "DOCX" | "PPTX" | "MP3"; url: string; description: string; audience?: "STUDENTS" | "PUBLIC" }

const HUB = "/bible";
export const MATERIALS: MaterialSeed[] = [
  { course: ["BIB101", "BIB102", "BIB103", "BIB104", "BIB107", "BIB208", "BIB301", "CFN105", "TEC207"], title: "Bible Hub: read, search and compare translations", kind: "URL", url: HUB, description: "KJV with Strong's numbers, BSB, ASV, Hebrew and Greek texts, concordance, topics and reading plans." },
  { course: ["LAN101", "HEB101", "HEB102", "HEB201", "HEB301", "GRK101", "GRK102", "GRK201", "GRK301", "BIB301"], title: "Hebrew and Greek lexicon (Strong's)", kind: "URL", url: "/bible/strongs", description: "Look up any Strong's number or search by original word, transliteration or English meaning." },
  { course: ["LAN101", "HEB101", "GRK101"], title: "Learn the Hebrew and Greek alphabets and key ministry words", kind: "URL", url: "/bible/languages", description: "Alphabet charts with sounds, and word studies for apostolic, pastoral, evangelical and prophetic ministry." },
  { course: ["LAN101", "HEB101", "GRK101", "BIB301"], title: "Blue Letter Bible — free online study tools", kind: "URL", url: "https://www.blueletterbible.org/", description: "An independent free site with lexicons and cross-references, for comparison with the Bible Hub." },
  { course: ["BIB101", "LAN101"], title: "eBible.org — free Bibles in many languages", kind: "URL", url: "https://ebible.org/", description: "Public-domain and openly licensed Bible translations to download for offline use." },
  { course: ["FIV210"], title: "Apostolic Teachings — the full library track", kind: "URL", url: "/teachings/apostolic", description: "Every teaching in this course with Word, PowerPoint and PDF downloads." },
  { course: ["FIV211"], title: "Pastoral Teachings — the full library track", kind: "URL", url: "/teachings/pastoral", description: "Every teaching in this course with Word, PowerPoint and PDF downloads." },
  { course: ["FIV212"], title: "Evangelical Teachings — the full library track", kind: "URL", url: "/teachings/evangelical", description: "Every teaching in this course with Word, PowerPoint and PDF downloads." },
  { course: ["FIV213"], title: "Prophetic Teachings — the full library track", kind: "URL", url: "/teachings/prophetic", description: "Every teaching in this course with Word, PowerPoint and PDF downloads." },
  { course: ["THE207", "THE212", "THE204", "THE307"], title: "Revival and Reformation Teachings", kind: "URL", url: "/teachings/revival", description: "Fourteen teachings on biblical and historical revival, with downloads." },
  { course: ["THE203", "THE204", "THE207", "THE212", "THE201", "THE202", "THE302", "BIB208"], title: "Christian Classics Ethereal Library", kind: "URL", url: "https://ccel.org/", description: "Thousands of public-domain Christian classics, commentaries and creeds, free to read online." },
  { course: ["KWE101", "KWE102", "KWE103", "KWE104", "KWE201", "KWE202", "KWE203", "KWE204", "KWE205", "KWE206", "KWE207", "KWE301", "KWE302"], title: "Kingdom Enterprise & Stewardship Teachings", kind: "URL", url: "/teachings/kingdom-enterprise", description: "Ten teachings on stewardship, work, budgeting, giving, tent-making and honest enterprise." },
  { course: ["TEC101", "TEC102", "TEC103", "TEC104", "TEC201", "TEC202", "TEC203", "TEC205", "TEC206", "TEC207", "TEC208"], title: "Technology & Media Teachings", kind: "URL", url: "/teachings/technology-ministry", description: "Practical, low-data guidance on digital safety, media, AI and online livelihood." },
  { course: ["EVM201", "EVM206", "EVM301", "EVM302"], title: "Lausanne Movement — mission resources", kind: "URL", url: "https://www.lausanne.org/", description: "Global evangelical mission documents including the Cape Town Commitment." },
  { course: ["MIN206"], title: "Keeping Children Safe — international safeguarding standards", kind: "URL", url: "https://www.keepingchildrensafe.global/", description: "Practical standards and training for organisations that work with children." },
  { teaching: ["caring-for-children-and-vulnerable-people"], title: "Keeping Children Safe — international safeguarding standards", kind: "URL", url: "https://www.keepingchildrensafe.global/", description: "Practical standards and training for organisations that work with children." },
  { teaching: ["the-protestant-reformation", "moravians-and-herrnhut", "the-great-awakening-and-the-wesleys"], title: "Christian Classics Ethereal Library", kind: "URL", url: "https://ccel.org/", description: "Read original and classic works from the periods discussed, free and public domain.", audience: "PUBLIC" },
  { teaching: ["how-to-study-the-bible", "the-bible-gods-word"], title: "Open the Bible Hub", kind: "URL", url: HUB, description: "Practise what you learn: tap words for Hebrew and Greek, search the concordance and keep notes.", audience: "PUBLIC" },
];
