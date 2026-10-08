import { eq } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_GRADING_SCALE, validateGradingScale } from "@/core/grading";
import { getDb, type Executor } from "./db";
import { settings } from "./db/schema";
import { AppError } from "./errors";

/**
 * Every configurable platform behaviour lives here with a typed schema and a safe default (spec §17, §111,
 * §130). Nothing security-relevant is read from the frontend, and every change is audited by the caller.
 */
const str = (max = 200) => z.string().max(max);

export const SETTING_SCHEMAS = {
  institution: z.object({
    name: str(120).min(2),
    shortName: str(30),
    parentMinistry: str(120),
    founder: str(120),
    founderTitle: str(200),
    sponsor: str(120),
    phone: str(40),
    email: str(120),
    website: str(200),
    address: str(300),
    country: str(60),
    motto: str(200),
    mottoRef: str(80),
    tagline: str(200),
  }),
  site: z.object({
    carouselSeconds: z.number().int().min(3).max(30),
    footerNote: str(300),
    poweredBy: str(160),
    showPoweredBy: z.boolean(),
    facebook: str(200),
    youtube: str(200),
    instagram: str(200),
    whatsapp: str(60),
    announcementBar: str(300),
  }),
  branding: z.object({
    logoAssetId: z.string().uuid().nullable(),
    heroAssetId: z.string().uuid().nullable(),
    founderPhotoAssetId: z.string().uuid().nullable(),
    founderPhoto2AssetId: z.string().uuid().nullable(),
    ogImageAssetId: z.string().uuid().nullable(),
    signatureAssetId: z.string().uuid().nullable(),
    sealAssetId: z.string().uuid().nullable(),
  }),
  academic: z.object({
    gradingScale: z.array(z.object({ min: z.number().int(), max: z.number().int(), grade: str(4).min(1), point: z.number(), label: str(40).optional() })).min(2).max(20),
    /** Lowest grade point that counts as a pass for a course. */
    passPoint: z.number().min(0).max(5),
    hoursPerCredit: z.number().int().min(5).max(60),
    semestersPerSession: z.number().int().min(1).max(4),
    minCreditsPerSemester: z.number().int().min(0).max(60),
    maxCreditsPerSemester: z.number().int().min(1).max(60),
    repeatPolicy: z.enum(["LATEST", "HIGHEST", "ALL"]),
    maxRepeatsPerCourse: z.number().int().min(0).max(10),
    standing: z.object({ warningBelow: z.number(), probationBelow: z.number(), suspensionBelow: z.number(), minCreditsForJudgement: z.number().int().min(0) }),
    classification: z.array(z.object({ minCgpa: z.number(), label: str(40) })).max(8),
    /** Component weights used when a course does not set its own. */
    defaultWeights: z.object({ assignment: z.number(), test: z.number(), exam: z.number(), practical: z.number() }),
    transferCreditsMaxPct: z.number().min(0).max(100),
  }),
  admissions: z.object({
    open: z.boolean(),
    applicationFee: z.number().min(0),
    currency: str(6),
    applicationNoPrefix: str(12),
    studentIdPrefix: str(12),
    studentIdDigits: z.number().int().min(3).max(8),
    referencesRequired: z.number().int().min(0).max(3),
    requiredDocuments: z.array(str(60)).max(12),
    offerValidDays: z.number().int().min(1).max(180),
    interviewNote: str(400),
  }),
  authentication: z.object({
    maxFailedLogins: z.number().int().min(3).max(20),
    lockMinutes: z.number().int().min(1).max(240),
    studentSessionHours: z.number().int().min(1).max(168),
    staffSessionHours: z.number().int().min(1).max(48),
    requireSuperAdmin2fa: z.boolean(),
    requireStaff2fa: z.boolean(),
    loginAlerts: z.boolean(),
  }),
  uploads: z.object({ maxImageMb: z.number().min(0.2).max(10), maxFileMb: z.number().min(1).max(25) }),
  certificates: z.object({
    numberPrefix: str(12),
    transcriptPrefix: str(12),
    signatories: z.array(z.object({ name: str(80), title: str(80) })).max(4),
    awardStatement: str(300),
    transcriptFooter: str(400),
  }),
  finance: z.object({
    currency: str(6),
    paymentInstructions: str(800),
    allowOnlinePayments: z.boolean(),
  }),
  localisation: z.object({
    defaultLanguage: str(10),
    timezone: str(60),
    currencies: z.array(str(6)).max(10),
  }),
  featureFlags: z.object({
    onlineExams: z.boolean(),
    aiAssistant: z.boolean(),
    digitalCertificates: z.boolean(),
    alumni: z.boolean(),
    pwa: z.boolean(),
    research: z.boolean(),
    library: z.boolean(),
    community: z.boolean(),
    techHub: z.boolean(),
    kingdomHub: z.boolean(),
    onlinePayments: z.boolean(),
  }),
} as const;

export type SettingKey = keyof typeof SETTING_SCHEMAS;
export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTING_SCHEMAS)[K]>;

/** Contact details come from the institutional brief; accreditation/recognition is deliberately never pre-claimed. */
export const SETTING_DEFAULTS: { [K in SettingKey]: SettingValue<K> } = {
  institution: {
    name: "Fodan Christian Global Bible School",
    shortName: "FCGBS",
    parentMinistry: "Fodan Gospel Outreach",
    founder: "Banjo Folahan Daniel",
    founderTitle: "Founder & President · Apostolic Teacher",
    sponsor: "The Living Youth International",
    phone: "08067578112",
    email: "folahandaniel@gmail.com",
    website: "https://bit.ly/4rSowUy",
    address: "Online & global — physical learning centre details to be published by the institution",
    country: "Nigeria",
    motto: "Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth.",
    mottoRef: "2 Timothy 2:15 (KJV)",
    tagline: "Rightly dividing the Word. Raising Kingdom ministers.",
  },
  site: {
    carouselSeconds: 7,
    footerNote: "Fodan Christian Global Bible School operates within the vision of Fodan Gospel Outreach.",
    poweredBy: "",
    showPoweredBy: false,
    facebook: "",
    youtube: "",
    instagram: "",
    whatsapp: "",
    announcementBar: "",
  },
  branding: { logoAssetId: null, heroAssetId: null, founderPhotoAssetId: null, founderPhoto2AssetId: null, ogImageAssetId: null, signatureAssetId: null, sealAssetId: null },
  academic: {
    gradingScale: DEFAULT_GRADING_SCALE,
    passPoint: 1.0,
    hoursPerCredit: 15,
    semestersPerSession: 2,
    minCreditsPerSemester: 6,
    maxCreditsPerSemester: 24,
    repeatPolicy: "LATEST",
    maxRepeatsPerCourse: 2,
    standing: { warningBelow: 2.0, probationBelow: 1.5, suspensionBelow: 1.0, minCreditsForJudgement: 12 },
    classification: [
      { minCgpa: 3.5, label: "Distinction" },
      { minCgpa: 3.0, label: "Credit" },
      { minCgpa: 2.0, label: "Merit" },
      { minCgpa: 1.0, label: "Pass" },
    ],
    defaultWeights: { assignment: 20, test: 20, exam: 60, practical: 0 },
    transferCreditsMaxPct: 50,
  },
  admissions: {
    open: true,
    applicationFee: 0,
    currency: "NGN",
    applicationNoPrefix: "FCGBS-APP",
    studentIdPrefix: "FCGBS",
    studentIdDigits: 4,
    referencesRequired: 1,
    requiredDocuments: ["Identification", "Highest qualification (if any)", "Passport photograph"],
    offerValidDays: 30,
    interviewNote: "Some applicants are invited to a short conversation about calling, background and goals.",
  },
  authentication: { maxFailedLogins: 5, lockMinutes: 15, studentSessionHours: 24, staffSessionHours: 8, requireSuperAdmin2fa: true, requireStaff2fa: false, loginAlerts: true },
  uploads: { maxImageMb: 3, maxFileMb: 12 },
  certificates: {
    numberPrefix: "FCGBS-CERT",
    transcriptPrefix: "FCGBS-TR",
    signatories: [
      { name: "Banjo Folahan Daniel", title: "Founder & President" },
      { name: "", title: "Registrar" },
    ],
    awardStatement: "has satisfied the academic and ministry-formation requirements of this institution and is hereby awarded the",
    transcriptFooter: "This transcript is an official record of the Fodan Christian Global Bible School only when it carries a valid verification code. Verify at the address printed on the document.",
  },
  finance: {
    currency: "NGN",
    paymentInstructions: "Payment details are issued by the Finance Office. Never pay into an account that is not published on this page or confirmed by the school.",
    allowOnlinePayments: false,
  },
  localisation: { defaultLanguage: "en", timezone: "Africa/Lagos", currencies: ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"] },
  featureFlags: { onlineExams: true, aiAssistant: false, digitalCertificates: true, alumni: true, pwa: true, research: true, library: true, community: true, techHub: true, kingdomHub: true, onlinePayments: false },
};

/**
 * Settings are read on almost every page, several at a time. Each value is kept in memory for a few
 * seconds so a page does not ask the database for the same row again and again. A change made in the
 * backend clears the copy at once on the server that saved it and reaches the others within the TTL.
 */
const SETTING_TTL_MS = 15_000;
const memo = new Map<string, { at: number; value: unknown }>();
export function clearSettingCache() {
  memo.clear();
}

export async function getSetting<K extends SettingKey>(key: K, db: Executor = getDb()): Promise<SettingValue<K>> {
  const shared = db === getDb();
  if (shared) {
    const hit = memo.get(key);
    if (hit && Date.now() - hit.at < SETTING_TTL_MS) return hit.value as SettingValue<K>;
  }
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, key)).limit(1);
  const fallback = SETTING_DEFAULTS[key];
  let value: SettingValue<K> = fallback;
  if (row) {
    // Merge so newly-added fields get defaults; re-validate so a bad row can never break the app.
    const parsed = SETTING_SCHEMAS[key].safeParse({ ...(fallback as object), ...(row.value as object) });
    if (parsed.success) value = parsed.data as SettingValue<K>;
  }
  if (shared) memo.set(key, { at: Date.now(), value });
  return value;
}

export async function getSettings<K extends SettingKey>(keys: K[]): Promise<{ [P in K]: SettingValue<P> }> {
  const out = {} as { [P in K]: SettingValue<P> };
  await Promise.all(keys.map(async (k) => ((out as Record<string, unknown>)[k] = await getSetting(k))));
  return out;
}

export async function putSetting<K extends SettingKey>(key: K, value: unknown, updatedBy: string, db: Executor = getDb()): Promise<{ before: SettingValue<K>; after: SettingValue<K> }> {
  const parsed = SETTING_SCHEMAS[key].safeParse(value);
  if (!parsed.success) throw new AppError("VALIDATION", `Invalid ${key} settings: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  if (key === "academic") {
    const a = parsed.data as SettingValue<"academic">;
    const err = validateGradingScale(a.gradingScale);
    if (err) throw new AppError("VALIDATION", err);
    const w = a.defaultWeights;
    if (w.assignment + w.test + w.exam + w.practical !== 100) throw new AppError("VALIDATION", "Default assessment weights must total 100.");
    if (a.minCreditsPerSemester > a.maxCreditsPerSemester) throw new AppError("VALIDATION", "Minimum credits cannot exceed maximum credits.");
  }
  const before = await getSetting(key, db);
  await db.insert(settings).values({ key, value: parsed.data, updatedBy }).onConflictDoUpdate({ target: settings.key, set: { value: parsed.data, updatedBy, updatedAt: new Date() } });
  memo.delete(key);
  return { before, after: parsed.data as SettingValue<K> };
}
