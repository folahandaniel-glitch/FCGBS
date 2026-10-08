"use client";

import { useState } from "react";
import type { ContentKey } from "@/content/defaults";
import type { SettingKey } from "@/server/settings";
import { resetContentAction, restoreContentAction, saveContentAction, saveSettingAction, uploadSiteImageAction } from "@/app/admin/actions";
import { ConfirmAction } from "../ui/interactive";
import { JsonEditor } from "./json-editor";

type J = Parameters<typeof JsonEditor>[0]["initial"];

export function ContentEditor({ contentKey, initial, history }: { contentKey: ContentKey; initial: J; history: { version: number; at: string }[] }) {
  return (
    <div className="space-y-6">
      <JsonEditor initial={initial} save={(json) => saveContentAction(contentKey, json)} upload={uploadSiteImageAction} />
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <ConfirmAction label="Restore default text" title="Restore the default text?" description="This replaces the current text with the original default. The current version stays in the history." run={() => resetContentAction(contentKey)} />
        {history.length > 0 && (
          <details className="text-sm"><summary className="cursor-pointer font-semibold text-royal-700">Version history ({history.length})</summary>
            <ul className="mt-2 space-y-1">{history.map((h) => <li key={h.version} className="flex items-center gap-3"><span>v{h.version} · {h.at}</span><ConfirmAction label="Restore" title={`Restore version ${h.version}?`} run={() => restoreContentAction(contentKey, h.version)} confirmVariant="primary" /></li>)}</ul>
          </details>
        )}
      </div>
    </div>
  );
}

export function SettingsEditor({ settingKey, initial, requireReason }: { settingKey: SettingKey; initial: J; requireReason?: boolean }) {
  const [reason, setReason] = useState("");
  return (
    <JsonEditor
      initial={initial}
      save={(json) => saveSettingAction(settingKey, json, reason)}
      saveLabel="Save settings"
      extra={requireReason ? <label className="block text-sm font-semibold text-navy-800">Reason for this change (recorded in the audit log)<input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 block w-full rounded-xl border border-line px-3.5 py-2.5 text-sm" /></label> : null}
    />
  );
}
