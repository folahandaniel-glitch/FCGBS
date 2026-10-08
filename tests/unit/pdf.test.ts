import { afterAll, beforeAll, expect, it } from "vitest";
import { freshDb } from "../support/db";
import { getDb } from "@/server/db";
import * as s from "@/server/db/schema";
import { certificatePdf, transcriptPdf } from "@/server/services/documents";

let close: () => Promise<void>;
beforeAll(async () => { close = (await freshDb()).close; }, 120000);
afterAll(async () => { await close?.(); });

it("returns null for unknown documents", async () => {
  expect(await certificatePdf("00000000-0000-0000-0000-000000000000")).toBeNull();
  expect(await transcriptPdf("00000000-0000-0000-0000-000000000000")).toBeNull();
  void getDb; void s;
});
