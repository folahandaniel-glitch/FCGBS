import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { ServiceWorker } from "@/components/service-worker";
import { getBrand } from "@/server/brand";

// One display face, one weight: the only web font downloaded. Body text uses the device's own font (fast, no data).
const display = Playfair_Display({ subsets: ["latin"], weight: ["700"], variable: "--font-display-face", display: "swap", preload: false });

export async function generateMetadata(): Promise<Metadata> {
  const b = await getBrand();
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    title: { default: `${b.name} (${b.shortName}) — ${b.tagline}`, template: `%s · ${b.shortName}` },
    description: `${b.name}: a Christ-centred, Scripture-centred Bible school offering Certificate, Diploma and Advanced Diploma programmes, ministry formation, the Fivefold Ministry framework, a Technology Hub and Kingdom Enterprise training. Operating within the vision of ${b.parentMinistry}.`,
    applicationName: b.shortName,
    manifest: "/manifest.webmanifest",
    openGraph: { title: b.name, description: b.tagline, siteName: b.name, images: [{ url: b.ogUrl, alt: `${b.name} logo` }], type: "website" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = { themeColor: "#0b2a5b", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the request makes pages dynamic so Next.js stamps the per-request CSP nonce on its scripts.
  await headers();
  return (
    <html lang="en" className={display.variable}>
      <body className="min-h-dvh">
        <a href="#main" className="skip-link">Skip to main content</a>
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
