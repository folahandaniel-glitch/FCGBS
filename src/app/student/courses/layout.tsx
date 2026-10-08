import { FeatureGate } from "@/components/access/feature-gate";

/** Access-code gate: this section opens only with an active access code that includes "COURSES" (staff are exempt). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeatureGate feature="COURSES" returnTo="/student/courses">{children}</FeatureGate>;
}
