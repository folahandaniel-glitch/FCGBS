/** Generates docs/ROLE_PERMISSION_MATRIX.md from the live permission catalogue and default roles. */
import fs from "node:fs";
import { PERMISSIONS, SYSTEM_ROLES } from "../src/core/permissions";

const groups = [...new Set(Object.values(PERMISSIONS).map((p) => p.group))];
let md = "# Role / permission matrix (generated)\n\nRoles are editable by the Super Admin; this is the **default** seed. `Yes` = the permission is granted. Scope rules (lecturer = assigned courses, HOD = department, mentor = assigned students, student = own records) are enforced in services on top of the permission.\n\n";
const keys = Object.keys(PERMISSIONS);
md += `| Permission | ${SYSTEM_ROLES.map((r) => r.name).join(" | ")} |\n|---|${SYSTEM_ROLES.map(() => "---").join("|")}|\n`;
for (const g of groups) {
  md += `| **${g}** |${SYSTEM_ROLES.map(() => "").join("|")}|\n`;
  for (const k of keys.filter((x) => PERMISSIONS[x as keyof typeof PERMISSIONS].group === g)) md += `| \`${k}\` | ${SYSTEM_ROLES.map((r) => (r.permissions.includes(k as never) ? "Yes" : "")).join(" | ")} |\n`;
}
md += "\n**Super Admin** holds every permission plus `super.roles`, `super.settings`, `super.security`, `super.accounts`, `super.system`, which can never be granted to a role.\n";
fs.writeFileSync("docs/ROLE_PERMISSION_MATRIX.md", md);
console.log("matrix written");
