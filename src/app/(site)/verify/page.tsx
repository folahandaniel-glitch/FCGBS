import type { Metadata } from "next";
import { Hero, Section } from "@/components/site/blocks";
import { VerifyResult } from "@/components/site/verify-result";
import { inputClass } from "@/components/ui/primitives";
import { reqCtx } from "@/server/http";
import { getContent } from "@/server/services/content";
import { verifyDocument } from "@/server/services/verify";
import { toPublicError } from "@/server/errors";

export const metadata: Metadata = { title: "Verify a Certificate", robots: { index: true } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const [{ code }, c] = await Promise.all([searchParams, getContent("verify")]);
  let result = null;
  let error: string | null = null;
  if (code) {
    try { result = await verifyDocument(code, await reqCtx()); } catch (e) { error = toPublicError(e).message; }
  }
  return (
    <>
      <Hero eyebrow="Public verification" title="VERIFY FCGBS CERTIFICATE">{c.intro}</Hero>
      <Section tone="white">
        <form className="flex max-w-xl flex-col gap-3 sm:flex-row" role="search">
          <label htmlFor="code" className="sr-only">Certificate number</label>
          <input id="code" name="code" defaultValue={code} placeholder="e.g. FCGBS-CERT-2027-0001" autoComplete="off" required className={inputClass} />
          <button className="h-11 rounded-xl bg-navy-800 px-6 text-sm font-semibold text-white hover:bg-navy-700">Verify</button>
        </form>
        <p className="mt-2 text-xs text-muted">Or scan the QR code on the certificate — it opens this page with the code filled in.</p>
        <div className="mt-8 max-w-2xl">
          {error && <p role="alert" className="rounded-xl bg-danger-50 p-4 text-sm text-danger-600">{error}</p>}
          {result && <VerifyResult v={result} />}
        </div>
      </Section>
    </>
  );
}
