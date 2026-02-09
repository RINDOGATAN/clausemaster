import { MapPin } from "lucide-react";

interface JurisdictionBadgeProps {
  jurisdiction: string;
}

const JURISDICTION_LABELS: Record<string, string> = {
  CALIFORNIA: "California, USA",
  ENGLAND_WALES: "England & Wales",
  SPAIN: "Spain, EU",
  UNKNOWN: "Unknown",
};

const JURISDICTION_FLAGS: Record<string, string> = {
  CALIFORNIA: "US",
  ENGLAND_WALES: "GB",
  SPAIN: "ES",
  UNKNOWN: "?",
};

export function JurisdictionBadge({ jurisdiction }: JurisdictionBadgeProps) {
  const label = JURISDICTION_LABELS[jurisdiction] || jurisdiction;

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">
      <MapPin className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
