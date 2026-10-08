"use server";

import { revalidatePath } from "next/cache";
import { action, type ActionResult } from "@/server/http";
import { AppError } from "@/server/errors";
import { readFormFile } from "@/server/files";
import { storeAsset } from "@/server/services/assets";
import { acceptOffer, addApplicationDocument, myApplication, saveApplication, submitApplication, withdrawApplication } from "@/server/services/admissions";

const g = (f: FormData, k: string) => f.get(k)?.toString().trim() ?? "";

export async function saveApplicationAction(_: ActionResult | null, f: FormData) {
  return action({ role: "applicant" }, async (a, ctx) => {
    await saveApplication(a, {
      programmeId: g(f, "programmeId"),
      personal: { dateOfBirth: g(f, "dateOfBirth"), gender: g(f, "gender"), phone: g(f, "phone"), address: g(f, "address"), country: g(f, "country"), nationality: g(f, "nationality"), idType: g(f, "idType"), idNumber: g(f, "idNumber") },
      education: [{ level: g(f, "eduLevel"), institution: g(f, "eduInstitution"), year: g(f, "eduYear"), qualification: g(f, "eduQualification") }].filter((e) => e.level || e.institution),
      ministryBackground: { church: g(f, "church"), role: g(f, "ministryRole"), years: g(f, "ministryYears"), description: g(f, "ministryDescription") },
      references: [1, 2].map((i) => ({ name: g(f, `refName${i}`), relationship: g(f, `refRel${i}`), email: g(f, `refEmail${i}`), phone: g(f, `refPhone${i}`) })).filter((r) => r.name || r.email),
      statement: g(f, "statement"),
    }, ctx);
    revalidatePath("/apply");
  }, "Draft saved.");
}

export async function uploadDocumentAction(_: ActionResult | null, f: FormData) {
  return action({ role: "applicant" }, async (a, ctx) => {
    const app = await myApplication(a.id);
    if (!app) throw new AppError("VALIDATION", "Save your application first, then upload documents.");
    const kind = ["IDENTIFICATION", "CERTIFICATE", "REFERENCE", "PHOTO", "OTHER"].includes(g(f, "kind")) ? g(f, "kind") : "OTHER";
    const asset = await storeAsset(a, await readFormFile(f), "APPLICATION", ctx, { scopeRef: app.id });
    await addApplicationDocument(a, app.id, kind, asset.id, ctx);
    revalidatePath("/apply");
  }, "Document uploaded.");
}

export async function submitApplicationAction() {
  return action({ role: "applicant" }, async (a, ctx) => {
    const app = await myApplication(a.id);
    if (!app) throw new AppError("NOT_FOUND", "No application found.");
    await submitApplication(a, app.id, ctx);
    revalidatePath("/apply");
  }, "Application submitted.");
}

export async function withdrawApplicationAction() {
  return action({ role: "applicant" }, async (a, ctx) => {
    const app = await myApplication(a.id);
    if (!app) throw new AppError("NOT_FOUND", "No application found.");
    await withdrawApplication(a, app.id, ctx);
    revalidatePath("/apply");
  }, "Application withdrawn.");
}

export async function acceptOfferAction() {
  return action({ role: "applicant" }, async (a, ctx) => {
    const app = await myApplication(a.id);
    if (!app) throw new AppError("NOT_FOUND", "No application found.");
    await acceptOffer(a, app.id, ctx);
    revalidatePath("/apply");
  }, "Offer accepted. The Registrar will complete your registration.");
}
