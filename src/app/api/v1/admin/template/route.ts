import { api } from "@/server/http";
import { buildTemplate } from "@/server/services/attachments";

export const dynamic = "force-dynamic";

/** The central upload template, rebuilt from the live site on every download. */
export const GET = api({ auth: "staff", perm: ["content.manage", "courses.manage"] }, async () => {
  const bytes = await buildTemplate();
  return new Response(new Uint8Array(bytes), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": 'attachment; filename="FCGBS-upload-template.xlsx"', "cache-control": "no-store" } });
});
