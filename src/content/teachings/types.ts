/** Seed shapes for the teaching library. Seeded once by slug; administrators then own and edit everything in the backend. */
export interface TrackSeed {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  colour: "royal" | "gold" | "amber" | "emerald" | "teal" | "violet" | "rose" | "sky";
  icon: "compass" | "shepherd" | "megaphone" | "flame" | "spark" | "landmark" | "book" | "cpu";
  sort: number;
}

export interface TeachingSeed {
  track: string;
  slug: string;
  title: string;
  summary: string;
  level: "FOUNDATION" | "INTERMEDIATE" | "ADVANCED";
  minutes: number;
  scriptures: string[];
  featured?: boolean;
  body: string;
}
