export type RiskLabel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface RiskScore {
  score: number;
  label: RiskLabel;
  color: string;
}

export function computeRiskScore(issues: { severity: string }[]): RiskScore {
  const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length;
  const warningCount = issues.filter((i) => i.severity === "WARNING").length;
  const infoCount = issues.filter((i) => i.severity === "INFO").length;

  const raw = criticalCount * 30 + warningCount * 10 + infoCount * 2;
  const score = Math.min(100, Math.max(0, raw));

  let label: RiskLabel;
  let color: string;

  if (score <= 15) {
    label = "LOW";
    color = "text-green-400";
  } else if (score <= 40) {
    label = "MODERATE";
    color = "text-yellow-400";
  } else if (score <= 70) {
    label = "HIGH";
    color = "text-orange-400";
  } else {
    label = "CRITICAL";
    color = "text-red-400";
  }

  return { score, label, color };
}
