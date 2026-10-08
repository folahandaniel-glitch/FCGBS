/* eslint-disable @next/next/no-img-element */
import { Card, PageHeader } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { requireStaffPage } from "@/server/http";
import { getSetting } from "@/server/settings";
import { setBrandAssetAction } from "../actions";

const SLOTS: { field: keyof Awaited<ReturnType<typeof getSetting<"branding">>>; label: string; help: string; fallback?: string }[] = [
  { field: "logoAssetId", label: "School logo", help: "Header, favicon source, login pages, certificates and transcripts. Use a PNG with transparent background.", fallback: "/brand/logo-full-480.webp" },
  { field: "heroAssetId", label: "Homepage hero background", help: "Optional wide picture shown faintly behind the homepage headline." },
  { field: "founderPhotoAssetId", label: "Founder picture 1", help: "Used on the homepage and Founder page.", fallback: "/brand/founder-1.jpg" },
  { field: "founderPhoto2AssetId", label: "Founder picture 2", help: "Second picture on the Founder page.", fallback: "/brand/founder-2.jpg" },
  { field: "ogImageAssetId", label: "Social sharing image", help: "Shown when the site is shared on WhatsApp, Facebook and others." },
  { field: "signatureAssetId", label: "Signature (certificates)", help: "Digital signature representation printed on certificates." },
  { field: "sealAssetId", label: "Seal / stamp (certificates)", help: "Institutional seal printed on certificates and transcripts." },
];

export default async function BrandingPage() {
  await requireStaffPage(["media.manage", "super.settings"]);
  const cfg = await getSetting("branding");
  return (
    <>
      <PageHeader title="Logo & pictures" description="Replace any picture used across the website, portals, certificates and transcripts. Images are validated and the logo is never distorted." />
      <div className="grid gap-5 md:grid-cols-2">
        {SLOTS.map((s) => {
          const id = cfg[s.field];
          const src = id ? `/api/v1/assets/${id}` : s.fallback;
          return (
            <Card key={s.field} className="p-5">
              <h2 className="font-bold text-navy-800">{s.label}</h2>
              <p className="mt-1 text-xs text-muted">{s.help}</p>
              <div className="my-4 grid h-36 place-items-center rounded-xl bg-surface ring-1 ring-line">{src ? <img src={src} alt="" className="max-h-32 max-w-full object-contain" /> : <span className="text-sm text-muted">No picture set</span>}</div>
              <ActionForm action={setBrandAssetAction} className="flex flex-wrap items-center gap-3" successMessage="Picture updated.">
                <input type="hidden" name="field" value={s.field} />
                <input type="file" name="file" accept="image/png,image/jpeg,image/webp,image/gif" required aria-label={`Choose ${s.label}`} className="text-sm" />
                <SubmitButton size="sm" pendingText="Uploading…">Upload</SubmitButton>
              </ActionForm>
              {id && <ActionForm action={setBrandAssetAction} className="mt-2" successMessage="Reverted to the default."><input type="hidden" name="field" value={s.field} /><input type="hidden" name="remove" value="1" /><SubmitButton size="sm" variant="ghost">Remove / use default</SubmitButton></ActionForm>}
            </Card>
          );
        })}
      </div>
    </>
  );
}
