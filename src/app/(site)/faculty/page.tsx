import type { Metadata } from "next";
import { Hero, Section } from "@/components/site/blocks";
import { publicFaculty } from "@/server/services/catalog";

export const metadata: Metadata = { title: "Faculty" };

export default async function FacultyPage() {
  const list = await publicFaculty();
  return (
    <>
      <Hero eyebrow="Teaching staff" title="Faculty">Faculty profiles are published here only after the institution confirms the appointment and the person agrees to a public profile.</Hero>
      <Section tone="white">
        {list.length === 0 ? <p className="text-muted">Faculty profiles will be published here as appointments are confirmed.</p> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((f, i) => (
              <div key={i} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                <p className="font-bold text-navy-800">{[f.title, f.firstName, f.lastName].filter(Boolean).join(" ")}</p>
                <p className="text-sm font-semibold text-gold-600">{[f.rank, f.department].filter(Boolean).join(" · ")}</p>
                {f.specialization && <p className="mt-2 text-sm text-muted">Specialisation: {f.specialization}</p>}
                {f.qualifications.length > 0 && <p className="mt-1 text-sm text-muted">{f.qualifications.join("; ")}</p>}
                {f.bio && <p className="mt-2 text-sm text-ink/80">{f.bio}</p>}
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
