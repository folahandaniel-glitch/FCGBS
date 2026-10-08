import type { ReactNode } from "react";
import type { Feature } from "@/core/features";
import { gateFor } from "@/server/gate";
import { recordsOpen } from "@/server/services/access";
import { getSession } from "@/server/http";
import { AccessGate } from "./gate";

/**
 * Wraps a section so it renders only for staff or for a learner whose active access code includes the feature.
 * Everything inside is never rendered, fetched or sent otherwise. `records`: results and records stay readable after a
 * code lapses (a graduate can always see their own record), unless the code never included them.
 */
export async function FeatureGate({ feature, returnTo, records, children }: { feature: Feature; returnTo: string; records?: boolean; children: ReactNode }) {
  const gate = await gateFor(feature);
  let ok = gate.ok;
  if (!ok && records && gate.signedIn) {
    const s = await getSession();
    ok = Boolean(s && (await recordsOpen(s.user.id, s.user.userType)));
  }
  if (ok) return <>{children}</>;
  return <AccessGate feature={feature} gate={gate} returnTo={returnTo} />;
}
