/**
 * LOCAL DEVELOPMENT ONLY — creates the owner Super Admin on a local database without 2FA, so the admin area can be
 * explored quickly. Refuses to run against any non-local database. Password is printed once.
 *   npx tsx --conditions=react-server --env-file=.env.local scripts/dev-admin.ts
 */
import { randomBytes } from "node:crypto";
import { getDb } from "../src/server/db";
import { bootstrapSuperAdmin } from "../src/server/services/auth";
import { putSetting, getSetting } from "../src/server/settings";
import { users } from "../src/server/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/127\.0\.0\.1|localhost/.test(url) || process.env.NODE_ENV === "production") throw new Error("Local databases only.");
  const pw = `Dev!${randomBytes(6).toString("base64url")}9a`;
  process.env.SETUP_TOKEN ??= "local-dev-setup-token";
  await bootstrapSuperAdmin({ setupToken: process.env.SETUP_TOKEN, email: "folahandaniel@gmail.com", password: pw, confirmPassword: pw }, { ip: "127.0.0.1" });
  const [u] = await getDb().select({ id: users.id }).from(users).where(eq(users.email, "folahandaniel@gmail.com"));
  const cfg = await getSetting("authentication");
  await putSetting("authentication", { ...cfg, requireSuperAdmin2fa: false, requireStaff2fa: false }, u.id);
  console.log(`✔ local Super Admin: folahandaniel@gmail.com / ${pw}  (2FA not required locally)`);
  process.exit(0);
}
main().catch((e) => { console.error("✖", e.message); process.exit(1); });
