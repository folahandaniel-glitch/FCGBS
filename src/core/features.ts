/**
 * The feature registry. A learner's access code decides which of these are open; there are no separate codes per feature.
 * To add a feature later, add it here and guard its pages/actions with the same key — nothing else about codes changes.
 * Staff and administrators are not limited by codes.
 */
export const FEATURES = {
  BIBLE: { label: "Bible Hub", group: "Bible", description: "Bible reader, concordance, Strong's Hebrew & Greek lexicon, topics, reading plans, notes." },
  TEACHINGS: { label: "Teaching Library", group: "Teachings", description: "Apostolic, Pastoral, Evangelical, Prophetic and Revival teachings, with Word, PowerPoint and PDF downloads." },
  QUESTIONS: { label: "Hard Questions & Apologetics", group: "Bible", description: "Disputed and difficult questions answered exegetically, historically, archaeologically, apostolically, prophetically and theologically." },
  COURSES: { label: "Courses & Lessons", group: "Learning", description: "Registered courses, lessons, study materials and attendance." },
  ASSESSMENTS: { label: "Assignments & Examinations", group: "Learning", description: "Assignments, tests and examinations." },
  RESULTS: { label: "Results & Records", group: "Records", description: "Results, GPA, transcript and certificate requests." },
  LIBRARY: { label: "Digital Library", group: "Learning", description: "Library resources and reading lists." },
  MINISTRY: { label: "Ministry Formation", group: "Formation", description: "Practicum, mentoring and spiritual formation." },
  RESEARCH: { label: "Research", group: "Learning", description: "Research projects and capstone." },
  HUBS: { label: "Technology Hub & Kingdom Enterprise", group: "Learning", description: "Digital skills and financial-independence pathways." },
  COMMUNITY: { label: "Community", group: "Community", description: "Moderated student and ministry discussion." },
} as const;

export type Feature = keyof typeof FEATURES;
export const FEATURE_KEYS = Object.keys(FEATURES) as Feature[];

/** What a code opens when no features were chosen for it. */
export const STANDARD_FEATURES: Feature[] = FEATURE_KEYS;

export const featuresOfCode = (code: { features: string[] | null }): Feature[] => (code.features ? FEATURE_KEYS.filter((f) => code.features!.includes(f)) : STANDARD_FEATURES);
export const sanitiseFeatures = (keys: unknown): Feature[] | null => (Array.isArray(keys) ? FEATURE_KEYS.filter((f) => keys.includes(f)) : null);

export const FEATURE_DENIED = "This feature is not included in your access plan. Please contact the school office.";

/** Pages of the student portal that need a code (anything not listed stays reachable: dashboard, profile, security, notifications). */
export const PORTAL_FEATURE_BY_PATH: [string, Feature][] = [
  ["/student/courses", "COURSES"], ["/student/learn", "COURSES"],
  ["/student/assessments", "ASSESSMENTS"], ["/student/exam", "ASSESSMENTS"],
  ["/student/results", "RESULTS"], ["/student/records", "RESULTS"],
  ["/student/library", "LIBRARY"], ["/student/community", "COMMUNITY"],
  ["/student/ministry", "MINISTRY"], ["/student/formation", "MINISTRY"],
  ["/student/research", "RESEARCH"], ["/student/hub", "HUBS"],
];
export const featureForPortalPath = (path: string): Feature | null => PORTAL_FEATURE_BY_PATH.find(([p]) => path === p || path.startsWith(`${p}/`))?.[1] ?? null;
