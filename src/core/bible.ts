/** Canon metadata and reference helpers (pure; no data loading). Book index = canonical order, 0-based. */
export interface BookMeta { i: number; slug: string; name: string; abbr: string; ot: boolean; group: string }

const RAW: [string, string, string, string][] = [
  ["genesis", "Genesis", "Gen", "Law"], ["exodus", "Exodus", "Exo", "Law"], ["leviticus", "Leviticus", "Lev", "Law"], ["numbers", "Numbers", "Num", "Law"], ["deuteronomy", "Deuteronomy", "Deu", "Law"],
  ["joshua", "Joshua", "Jos", "History"], ["judges", "Judges", "Jdg", "History"], ["ruth", "Ruth", "Rut", "History"], ["1-samuel", "1 Samuel", "1Sa", "History"], ["2-samuel", "2 Samuel", "2Sa", "History"],
  ["1-kings", "1 Kings", "1Ki", "History"], ["2-kings", "2 Kings", "2Ki", "History"], ["1-chronicles", "1 Chronicles", "1Ch", "History"], ["2-chronicles", "2 Chronicles", "2Ch", "History"], ["ezra", "Ezra", "Ezr", "History"],
  ["nehemiah", "Nehemiah", "Neh", "History"], ["esther", "Esther", "Est", "History"],
  ["job", "Job", "Job", "Wisdom & Poetry"], ["psalms", "Psalms", "Psa", "Wisdom & Poetry"], ["proverbs", "Proverbs", "Pro", "Wisdom & Poetry"], ["ecclesiastes", "Ecclesiastes", "Ecc", "Wisdom & Poetry"], ["song-of-solomon", "Song of Solomon", "Sng", "Wisdom & Poetry"],
  ["isaiah", "Isaiah", "Isa", "Major Prophets"], ["jeremiah", "Jeremiah", "Jer", "Major Prophets"], ["lamentations", "Lamentations", "Lam", "Major Prophets"], ["ezekiel", "Ezekiel", "Eze", "Major Prophets"], ["daniel", "Daniel", "Dan", "Major Prophets"],
  ["hosea", "Hosea", "Hos", "Minor Prophets"], ["joel", "Joel", "Joe", "Minor Prophets"], ["amos", "Amos", "Amo", "Minor Prophets"], ["obadiah", "Obadiah", "Oba", "Minor Prophets"], ["jonah", "Jonah", "Jon", "Minor Prophets"],
  ["micah", "Micah", "Mic", "Minor Prophets"], ["nahum", "Nahum", "Nah", "Minor Prophets"], ["habakkuk", "Habakkuk", "Hab", "Minor Prophets"], ["zephaniah", "Zephaniah", "Zep", "Minor Prophets"], ["haggai", "Haggai", "Hag", "Minor Prophets"],
  ["zechariah", "Zechariah", "Zec", "Minor Prophets"], ["malachi", "Malachi", "Mal", "Minor Prophets"],
  ["matthew", "Matthew", "Mat", "Gospels & Acts"], ["mark", "Mark", "Mar", "Gospels & Acts"], ["luke", "Luke", "Luk", "Gospels & Acts"], ["john", "John", "Jhn", "Gospels & Acts"], ["acts", "Acts", "Act", "Gospels & Acts"],
  ["romans", "Romans", "Rom", "Pauline Letters"], ["1-corinthians", "1 Corinthians", "1Co", "Pauline Letters"], ["2-corinthians", "2 Corinthians", "2Co", "Pauline Letters"], ["galatians", "Galatians", "Gal", "Pauline Letters"], ["ephesians", "Ephesians", "Eph", "Pauline Letters"],
  ["philippians", "Philippians", "Phl", "Pauline Letters"], ["colossians", "Colossians", "Col", "Pauline Letters"], ["1-thessalonians", "1 Thessalonians", "1Th", "Pauline Letters"], ["2-thessalonians", "2 Thessalonians", "2Th", "Pauline Letters"],
  ["1-timothy", "1 Timothy", "1Ti", "Pauline Letters"], ["2-timothy", "2 Timothy", "2Ti", "Pauline Letters"], ["titus", "Titus", "Tit", "Pauline Letters"], ["philemon", "Philemon", "Phm", "Pauline Letters"],
  ["hebrews", "Hebrews", "Heb", "General Letters & Revelation"], ["james", "James", "Jas", "General Letters & Revelation"], ["1-peter", "1 Peter", "1Pe", "General Letters & Revelation"], ["2-peter", "2 Peter", "2Pe", "General Letters & Revelation"],
  ["1-john", "1 John", "1Jo", "General Letters & Revelation"], ["2-john", "2 John", "2Jo", "General Letters & Revelation"], ["3-john", "3 John", "3Jo", "General Letters & Revelation"], ["jude", "Jude", "Jde", "General Letters & Revelation"], ["revelation", "Revelation", "Rev", "General Letters & Revelation"],
];

export const BOOKS: BookMeta[] = RAW.map(([slug, name, abbr, group], i) => ({ i, slug, name, abbr, ot: i < 39, group }));
export const bookBySlug = (slug: string) => BOOKS.find((b) => b.slug === slug);

const ALIASES: Record<string, number> = {};
BOOKS.forEach((b) => {
  for (const k of [b.name, b.abbr, b.slug.replace(/-/g, " ")]) ALIASES[k.toLowerCase().replace(/\./g, "").replace(/\s+/g, "")] = b.i;
});
Object.assign(ALIASES, { gn: 0, ex: 1, lv: 2, nm: 3, dt: 4, jsh: 5, jg: 6, "1sam": 8, "2sam": 9, "1kgs": 10, "2kgs": 11, "1chr": 12, "2chr": 13, ps: 18, psalm: 18, prov: 19, eccl: 20, song: 21, songofsongs: 21, is: 22, jer: 23, ezek: 25, dn: 26, jn: 42, matt: 39, mt: 39, mk: 40, lk: 41, rm: 44, "1cor": 45, "2cor": 46, gl: 47, phil: 49, philippians: 49, php: 49, "1thess": 51, "2thess": 52, "1tim": 53, "2tim": 54, heb: 57, jm: 58, "1pet": 59, "2pet": 60, "1jn": 61, "2jn": 62, "3jn": 63, rv: 65, revelations: 65 });

export interface Ref { book: number; chapter: number; v1?: number; v2?: number }

/** Parses "John 3:16", "Ps 23", "1 Cor 13:4-7", "Rom 8". Returns null if it is not a valid reference. */
const ONE_CHAPTER = new Set([30, 56, 62, 63, 64]); // Obadiah, Philemon, 2 John, 3 John, Jude

export function parseRef(input: string): Ref | null {
  const m = input.trim().match(/^((?:[1-3]\s*)?[A-Za-z][A-Za-z.\s]*?)\s*(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
  if (!m) return null;
  const key = m[1].toLowerCase().replace(/[.\s]/g, "");
  const book = ALIASES[key];
  if (book === undefined) return null;
  // "Jude 3" means verse 3 of the only chapter
  if (ONE_CHAPTER.has(book) && !m[3] && Number(m[2]) > 1) return { book, chapter: 1, v1: Number(m[2]) };
  return { book, chapter: Number(m[2]), v1: m[3] ? Number(m[3]) : undefined, v2: m[4] ? Number(m[4]) : undefined };
}

export const refLabel = (r: Ref) => `${BOOKS[r.book].name} ${r.chapter}${r.v1 ? `:${r.v1}${r.v2 && r.v2 !== r.v1 ? `–${r.v2}` : ""}` : ""}`;
export const refHref = (r: Ref, t?: string) => `/bible/${BOOKS[r.book].slug}/${r.chapter}${t && t !== "kjv" ? `?t=${t}` : ""}${r.v1 ? `#v${r.v1}` : ""}`;

export const TRANSLATIONS = [
  { id: "kjv", name: "KJV", full: "King James Version (with Strong's numbers)", lang: "en", note: "Public domain" },
  { id: "bsb", name: "BSB", full: "Berean Standard Bible", lang: "en", note: "Public domain (dedicated 2023)" },
  { id: "asv", name: "ASV", full: "American Standard Version (1901)", lang: "en", note: "Public domain" },
  { id: "wlc", name: "Hebrew", full: "Westminster Leningrad Codex (Hebrew Old Testament)", lang: "he", note: "Public domain" },
  { id: "tr", name: "Greek", full: "Textus Receptus (Greek New Testament)", lang: "el", note: "Public domain" },
] as const;
export type TranslationId = (typeof TRANSLATIONS)[number]["id"];
export const isTranslation = (x: string | undefined): x is TranslationId => TRANSLATIONS.some((t) => t.id === x);
/** Whether a translation has text for a book index. */
export const hasText = (t: TranslationId, book: number) => (t === "wlc" ? book < 39 : t === "tr" ? book >= 39 : true);
