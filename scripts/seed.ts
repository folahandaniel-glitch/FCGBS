/** Structural seed: safe, idempotent, contains no people or demo records. */
import { getDb } from "../src/server/db";
import { seedStructure } from "../src/server/seed";

async function main() {
  await seedStructure(getDb());
  console.log("✔ structure seeded (roles, departments, courses, programmes, policies, library)");
  process.exit(0);
}
main().catch((e) => { console.error("✖ seed failed:", e); process.exit(1); });
