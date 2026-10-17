import { FeatureGate } from "@/components/access/feature-gate";

/** Access-code gate: Hard Questions opens only with an active access code that includes "QUESTIONS" (staff are exempt). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeatureGate feature="QUESTIONS" returnTo="/questions">{children}</FeatureGate>;
}
