/** Seed shape for a hard question. Each lens is optional: only lenses that genuinely apply are written. */
export interface QuestionSeed {
  slug: string;
  title: string;
  category: string;
  summary: string;
  exegetical?: string;
  genealogical?: string;
  archaeological?: string;
  apostolic?: string;
  prophetic?: string;
  theological?: string;
  views?: string;
  pastoral?: string;
  scriptures: string[];
  readings?: string[];
  featured?: boolean;
}
