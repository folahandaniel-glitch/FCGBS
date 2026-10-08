import type { Metadata } from "next";
import { Alert, ButtonLink } from "@/components/ui/primitives";
import { Checklist, Hero, Section } from "@/components/site/blocks";
import { ADMISSION_BY_LEVEL } from "@/content/programmes";
import { getSetting } from "@/server/settings";
import { getContent } from "@/server/services/content";

export const metadata: Metadata = { title: "Admissions & How to Apply" };

export default async function AdmissionsPage() {
  const [a, cfg] = await Promise.all([getContent("admissionsPage"), getSetting("admissions")]);
  return (
    <>
      <Hero eyebrow="Join FCGBS" title={a.title}>{a.intro}</Hero>
      <Section title="How to apply" tone="white">
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {a.steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-line bg-surface p-5">
              <span className="grid size-9 place-items-center rounded-full bg-navy-800 text-sm font-bold text-gold-400">{i + 1}</span>
              <h3 className="mt-3 font-bold text-navy-800">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8">{cfg.open ? <ButtonLink href="/apply" variant="gold" size="lg">Create an applicant account</ButtonLink> : <Alert tone="warning" title="Applications are currently closed">Please check back or contact the Admissions Office.</Alert>}</div>
      </Section>
      <Section title="Admission requirements">
        <div className="grid gap-6 lg:grid-cols-3">
          {(["CERTIFICATE", "DIPLOMA", "ADVANCED_DIPLOMA"] as const).map((k) => (
            <div key={k} className="rounded-2xl border border-line bg-white p-5"><h3 className="font-bold text-navy-800">{k === "ADVANCED_DIPLOMA" ? "Advanced Diploma" : k === "DIPLOMA" ? "Diploma" : "Certificate"}</h3><div className="mt-3"><Checklist items={ADMISSION_BY_LEVEL[k]} /></div></div>
          ))}
        </div>
        <p className="mt-5 max-w-3xl text-sm text-muted">{a.requirementsNote}</p>
        <p className="mt-3 text-sm text-muted">{cfg.interviewNote}</p>
        <p className="mt-3 max-w-3xl text-sm text-muted">{a.feesNote}</p>
      </Section>
    </>
  );
}
