/**
 * Local development PostgreSQL: a real Postgres engine (PGlite/WASM) exposed on
 * the wire protocol at 127.0.0.1:5433, persisted in ./.data/pglite.
 * Production uses a managed PostgreSQL (e.g. Neon via Vercel) — same SQL.
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import fs from "node:fs";

const port = Number(process.env.LOCAL_DB_PORT ?? 5433);
fs.mkdirSync(".data", { recursive: true });
const db = await PGlite.create(".data/pglite");
// Queries from multiple connections are serialised by PGlite itself.
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 20 });
await server.start();
console.log(`✔ Local PostgreSQL (PGlite) listening on postgres://postgres@127.0.0.1:${port}/postgres`);
const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
