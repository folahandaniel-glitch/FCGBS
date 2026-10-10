import Link from "next/link";
import { Card, PageHeader } from "@/components/ui/primitives";
import { SettingsEditor } from "@/components/admin/editors";
import { can } from "@/core/permissions";
import { requireStaffPage } from "@/server/http";
import { getSetting, SETTING_SCHEMAS, type SettingKey } from "@/server/settings";

const TABS: { key: SettingKey; label: string; perm: "settings.academic" | "settings.admissions" | "super.settings"; reason?: boolean }[] = [
  { key: "institution", label: "Institution", perm: "super.settings" },
  { key: "site", label: "Website", perm: "super.settings" },
  { key: "academic", label: "Grading, credits & standing", perm: "settings.academic", reason: true },
  { key: "admissions", label: "Admissions", perm: "settings.admissions" },
  { key: "certificates", label: "Certificates & transcripts", perm: "settings.academic", reason: true },
  { key: "finance", label: "Finance", perm: "super.settings" },
  { key: "authentication", label: "Security & sessions", perm: "super.settings", reason: true },
  { key: "accessCodes", label: "Access codes", perm: "super.settings", reason: true },
  { key: "selfService", label: "Self-service enrolment", perm: "super.settings", reason: true },
  { key: "uploads", label: "Uploads", perm: "super.settings" },
  { key: "localisation", label: "Localisation", perm: "super.settings" },
  { key: "featureFlags", label: "Feature flags", perm: "super.settings", reason: true },
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sess = await requireStaffPage(["settings.academic", "settings.admissions", "super.settings"]);
  const visible = TABS.filter((t) => can(sess.actor, t.perm));
  const wanted = (await searchParams).tab;
  const tab = visible.find((t) => t.key === wanted) ?? visible[0];
  const value = tab && (await getSetting(tab.key));
  void SETTING_SCHEMAS;
  return (
    <>
      <PageHeader title="System settings" description="Every change is validated on the server and written to the audit log with the previous and new values." />
      <div className="mb-5 flex flex-wrap gap-2">{visible.map((t) => <Link key={t.key} href={`/admin/settings?tab=${t.key}`} className={`rounded-xl px-3.5 py-2 text-sm font-semibold ${t.key === tab?.key ? "bg-navy-800 text-white" : "bg-white text-navy-800 ring-1 ring-line hover:bg-royal-50"}`}>{t.label}</Link>)}</div>
      {tab && <Card className="p-5"><SettingsEditor key={tab.key} settingKey={tab.key} initial={JSON.parse(JSON.stringify(value))} requireReason={tab.reason} /></Card>}
    </>
  );
}
