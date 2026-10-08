import { FeatureGate } from "@/components/access/feature-gate";

/** Access-code gate: this section opens only with an active access code that includes "COMMUNITY" (staff are exempt). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeatureGate feature="COMMUNITY" returnTo="/student/community">{children}</FeatureGate>;
}
