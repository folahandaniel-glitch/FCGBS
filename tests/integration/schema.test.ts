import { afterAll, beforeAll, expect, it } from "vitest";
import { freshDb } from "../support/db";
import { audit } from "@/server/audit";
import { getDb } from "@/server/db";
import { getSetting } from "@/server/settings";

let close: () => Promise<void>;
beforeAll(async () => { close = (await freshDb()).close; });
afterAll(async () => { await close?.(); });

it("migrations apply and settings default", async () => {
  expect((await getSetting("institution")).shortName).toBe("FCGBS");
});
it("audit log is append-only", async () => {
  await audit({ action: "test.event" });
  await expect(getDb().execute("update audit_logs set action='x'" as never)).rejects.toThrow();
});
