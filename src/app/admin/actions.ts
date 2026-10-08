"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ContentKey } from "@/content/defaults";
import { CONTENT_DEFAULTS } from "@/content/defaults";
import { action, type ActionResult } from "@/server/http";
import { AppError } from "@/server/errors";
import { audit } from "@/server/audit";
import { readFormFile } from "@/server/files";
import { putSetting, SETTING_SCHEMAS, type SettingKey } from "@/server/settings";
import { putContent, resetContent, restoreContentVersion } from "@/server/services/content";
import { storeAsset } from "@/server/services/assets";
import { beginTotpEnrolment, changePassword, confirmTotpEnrolment, disableTotp } from "@/server/services/auth";
import { revokeAllSessions } from "@/server/auth/session";

const fd = (f: FormData) => Object.fromEntries(Array.from(f.keys()).map((k) => [k, f.get(k)?.toString() ?? ""]));

/* ---------------------------------------------------------------- my security */

export async function changePasswordAction(_: ActionResult | null, form: FormData) {
  return action({ role: "any" }, async (a, ctx, s) => {
    await changePassword(a, fd(form), s.sessionId, ctx);
  }, "Password changed.");
}
export async function beginTotpAction() {
  return action({ role: "any" }, async (a) => ({ secret: await beginTotpEnrolment(a) }));
}
export async function confirmTotpAction(code: string) {
  return action({ role: "any" }, async (a, ctx) => ({ codes: await confirmTotpEnrolment(a, code, ctx) }));
}
export async function disableTotpAction(password: string) {
  return action({ role: "any" }, async (a, ctx) => disableTotp(a, password, ctx), "Two-factor authentication disabled.");
}
export async function revokeOtherSessionsAction() {
  return action({ role: "any" }, async (a, ctx, s) => {
    const n = await revokeAllSessions(a.id, "USER_REVOKED_ALL", s.sessionId);
    await audit({ actor: a, action: "security.sessions_revoked", entityType: "user", entityId: a.id, metadata: { count: n } }, ctx);
    return { revoked: n };
  }, "Other sessions signed out.");
}

/* ------------------------------------------------------------ website content */

export async function saveContentAction(key: ContentKey, json: string) {
  return action({ role: "staff", perm: "content.manage" }, async (a, ctx) => {
    if (!(key in CONTENT_DEFAULTS)) throw new AppError("VALIDATION", "Unknown content block.");
    let value: unknown;
    try { value = JSON.parse(json); } catch { throw new AppError("VALIDATION", "Invalid content."); }
    await putContent(a, key, value as never, ctx);
    revalidatePath("/", "layout");
  }, "Saved. The website has been updated.");
}
export async function resetContentAction(key: ContentKey) {
  return action({ role: "staff", perm: "content.manage" }, async (a, ctx) => { await resetContent(a, key, ctx); revalidatePath("/", "layout"); }, "Restored to the default text.");
}
export async function restoreContentAction(key: ContentKey, version: number) {
  return action({ role: "staff", perm: "content.manage" }, async (a, ctx) => { await restoreContentVersion(a, key, version, ctx); revalidatePath("/", "layout"); }, "Previous version restored.");
}

/** Uploads an image for use inside content (carousel slides, leadership photos, posts). Returns the asset id. */
export async function uploadSiteImageAction(form: FormData) {
  return action({ role: "staff", perm: ["content.manage", "media.manage"] }, async (a, ctx) => {
    const file = await readFormFile(form);
    const r = await storeAsset(a, file, "SITE", ctx, { alt: form.get("alt")?.toString() });
    return { id: r.id, url: r.url };
  }, "Image uploaded.");
}

/* ------------------------------------------------------------- branding assets */

const BRAND_FIELDS = ["logoAssetId", "heroAssetId", "founderPhotoAssetId", "founderPhoto2AssetId", "ogImageAssetId", "signatureAssetId", "sealAssetId"] as const;

export async function setBrandAssetAction(_: ActionResult | null, form: FormData) {
  return action({ role: "staff", perm: ["media.manage", "super.settings"] }, async (a, ctx) => {
    const field = z.enum(BRAND_FIELDS).parse(form.get("field"));
    const remove = form.get("remove") === "1";
    const { getSetting } = await import("@/server/settings");
    const cur = await getSetting("branding");
    let assetId: string | null = null;
    if (!remove) {
      const file = await readFormFile(form);
      assetId = (await storeAsset(a, file, "BRAND", ctx, { alt: field })).id;
    }
    const { before, after } = await putSetting("branding", { ...cur, [field]: assetId }, a.id);
    await audit({ actor: a, action: "settings.branding_changed", entityType: "setting", entityId: "branding", metadata: { field, before: before[field], after: after[field] } }, ctx);
    revalidatePath("/", "layout");
  }, "Saved.");
}

/* ------------------------------------------------------------------- settings */

export async function saveSettingAction(key: SettingKey, json: string, reason?: string) {
  const perm = key === "academic" || key === "certificates" ? (["settings.academic", "super.settings"] as const) : key === "admissions" ? (["settings.admissions", "super.settings"] as const) : (["super.settings"] as const);
  return action({ role: "staff", perm: [...perm] }, async (a, ctx) => {
    if (!(key in SETTING_SCHEMAS)) throw new AppError("VALIDATION", "Unknown setting.");
    let value: unknown;
    try { value = JSON.parse(json); } catch { throw new AppError("VALIDATION", "Invalid settings."); }
    const { before, after } = await putSetting(key, value, a.id);
    await audit({ actor: a, action: `settings.${key}_changed`, entityType: "setting", entityId: key, summary: reason, metadata: { before, after, reason } }, ctx);
    revalidatePath("/", "layout");
  }, "Settings saved and audited.");
}
