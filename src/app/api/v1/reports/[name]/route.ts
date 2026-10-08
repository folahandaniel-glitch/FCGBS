import { audit } from "@/server/audit";
import { api, fileResponse } from "@/server/http";
import { AppError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { can } from "@/core/permissions";
import { REPORTS, toCsv } from "@/server/services/reports";

/** CSV export of an institutional report. Needs reports.export plus the report's own view permission. */
export const GET = api<{ name: string }>({ auth: "staff", perm: "reports.export" }, async ({ params, actor, ctx }) => {
  const r = REPORTS.find((x) => x.key === params.name);
  if (!r) throw new AppError("NOT_FOUND", "Report not found.");
  if (!can(actor, r.perm)) throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  await rateLimit("export", actor!.id, ctx);
  const rows = await r.query();
  await audit({ actor, action: "report.exported", entityType: "report", entityId: r.key, metadata: { rows: rows.length } }, ctx);
  return fileResponse(toCsv(r.columns, rows), "text/csv; charset=utf-8", `fcgbs-${r.key}-${new Date().toISOString().slice(0, 10)}.csv`);
});
