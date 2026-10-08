import { api } from "@/server/http";
import { revealBatch } from "@/server/services/access";

/** CSV of one generated batch (codes are decrypted and the export is audited). Staff with `codes.generate` only. */
export const GET = api({ auth: "staff", perm: "codes.generate" }, async ({ req, actor, ctx }) => {
  const batch = req.nextUrl.searchParams.get("batchId") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(batch)) return new Response("Bad batch", { status: 400 });
  const rows = await revealBatch(actor!, batch, ctx);
  const csv = ["code,status", ...rows.map((r) => `${r.code},${r.status}`)].join("\n") + "\n";
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="fcgbs-access-codes-${batch.slice(0, 8)}.csv"`, "Cache-Control": "private, no-store" } });
});
