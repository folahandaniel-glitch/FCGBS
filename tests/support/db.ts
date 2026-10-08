import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { setDb, schema, type DB } from "@/server/db";
import { clearSettingCache } from "@/server/settings";

/** Fresh, fully-migrated in-memory PostgreSQL for each test file. */
export async function freshDb() {
  const client = await PGlite.create();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  setDb(db as unknown as DB);
  clearSettingCache();
  return { db: db as unknown as DB, close: () => client.close() };
}
