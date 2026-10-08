import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { Hero, Section } from "@/components/site/blocks";
import { ActionForm, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { getBrand } from "@/server/brand";
import { getContent } from "@/server/services/content";
import { contactAction } from "./actions";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const [b, c] = await Promise.all([getBrand(), getContent("contact")]);
  return (
    <>
      <Hero eyebrow="Get in touch" title={c.title}>{c.intro}</Hero>
      <Section tone="white">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4 text-sm">
            <p className="flex items-center gap-3"><Phone className="size-5 text-gold-600" aria-hidden /><a href={`tel:${b.phone}`} className="font-semibold text-navy-800 hover:underline">{b.phone}</a></p>
            <p className="flex items-center gap-3"><Mail className="size-5 text-gold-600" aria-hidden /><a href={`mailto:${b.email}`} className="font-semibold text-navy-800 hover:underline">{b.email}</a></p>
            <p className="flex items-start gap-3"><MapPin className="mt-0.5 size-5 shrink-0 text-gold-600" aria-hidden /><span>{b.address}</span></p>
            <p className="text-muted">{c.hours}</p>
          </div>
          <ActionForm action={contactAction} resetOnSuccess className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2"><TextField label="Your name" name="name" required autoComplete="name" /><TextField label="Email" name="email" type="email" required autoComplete="email" /></div>
            <TextField label="Subject" name="subject" required />
            <TextAreaField label="Message" name="message" rows={6} required />
            <div className="hidden" aria-hidden><input name="website" tabIndex={-1} autoComplete="off" /></div>
            <SubmitButton pendingText="Sending…">Send message</SubmitButton>
          </ActionForm>
        </div>
      </Section>
    </>
  );
}
