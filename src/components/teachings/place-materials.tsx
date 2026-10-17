import { getSession } from "@/server/http";
import { materialsForPlace } from "@/server/services/attachments";
import { MaterialList } from "./materials";

/** Files and links the administrators attached to one place (a question, topic, plan, lesson, track …). Renders nothing when there are none. */
export async function PlaceMaterials({ place, title = "Files & links" }: { place: string; title?: string }) {
  const sess = await getSession();
  const signedIn = Boolean(sess && !sess.mfaPending && sess.user.userType !== "APPLICANT");
  const items = await materialsForPlace(place, signedIn);
  if (!items.length) return null;
  return <div className="mt-6"><MaterialList items={items} title={title} /></div>;
}
