import "server-only";
import type { Feature } from "@/core/features";
import { getBrand } from "./brand";
import { getSession } from "./http";
import { allows, getAccessState, type AccessState } from "./services/access";
import { getSetting } from "./settings";

export interface Gate { ok: boolean; signedIn: boolean; userType?: string; state: AccessState | null }

/** Resolves whether the current visitor may use a feature. Staff pass; learners need an active code that includes it. */
export async function gateFor(feature: Feature): Promise<Gate> {
  const s = await getSession();
  if (!s || s.mfaPending) return { ok: false, signedIn: false, state: null };
  const state = await getAccessState(s.user.id, s.user.userType);
  return { ok: allows(state, feature), signedIn: true, userType: s.user.userType, state };
}

/** Where to tell people to get a code (settings first, otherwise the school's phone). */
export async function accessContact() {
  const [cfg, brand] = await Promise.all([getSetting("accessCodes"), getBrand()]);
  return { contact: cfg.contact || brand.phone, note: cfg.contactNote };
}
