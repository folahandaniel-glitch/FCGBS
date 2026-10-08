import { api } from "@/server/http";
import { getAccessState } from "@/server/services/access";

/** The signed-in person's access state (web and future mobile apps). Always read from the server clock. */
export const GET = api({ auth: "any", access: false }, async ({ actor }) => getAccessState(actor!.id, actor!.userType));
