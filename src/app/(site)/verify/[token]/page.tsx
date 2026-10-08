import { redirect } from "next/navigation";

/** QR codes encode /verify/<token>; forward to the verification page, which performs the (rate-limited) lookup. */
export default async function VerifyTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/verify?code=${encodeURIComponent(token.slice(0, 80))}`);
}
