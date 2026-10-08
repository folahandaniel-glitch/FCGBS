import { FeatureGate } from "@/components/access/feature-gate";

/** Access-code gate: this section opens only with an active access code that includes "ASSESSMENTS" (staff are exempt). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeatureGate feature="ASSESSMENTS" returnTo="/student/exam">{children}</FeatureGate>;
}
