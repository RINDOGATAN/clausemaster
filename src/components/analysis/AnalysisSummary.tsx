"use client";

import { useTranslations } from "next-intl";
import { Calendar, Users, Scale } from "lucide-react";
import { ContractTypeBadge } from "./ContractTypeBadge";
import { JurisdictionBadge } from "./JurisdictionBadge";
import { IssueBadge } from "./IssueBadge";

interface AnalysisSummaryProps {
  analysis: {
    contractType?: string | null;
    contractTypeLabel?: string | null;
    jurisdiction: string;
    jurisdictionNotes?: string | null;
    summary?: string | null;
    partyNames: string[];
    effectiveDate?: string | null;
    aiProvider?: string | null;
    aiModel?: string | null;
    processingTimeMs?: number | null;
    issues: { severity: string }[];
  };
}

export function AnalysisSummary({ analysis }: AnalysisSummaryProps) {
  const t = useTranslations("analysis");

  const criticalCount = analysis.issues.filter((i) => i.severity === "CRITICAL").length;
  const warningCount = analysis.issues.filter((i) => i.severity === "WARNING").length;
  const infoCount = analysis.issues.filter((i) => i.severity === "INFO").length;

  return (
    <div className="card-brutal">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {analysis.contractTypeLabel && (
          <ContractTypeBadge type={analysis.contractType || ""} label={analysis.contractTypeLabel} />
        )}
        <JurisdictionBadge jurisdiction={analysis.jurisdiction} />
      </div>

      {analysis.summary && (
        <p className="text-foreground mb-4">{analysis.summary}</p>
      )}

      <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-4">
        {analysis.partyNames.length > 0 && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{analysis.partyNames.join(", ")}</span>
          </div>
        )}
        {analysis.effectiveDate && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{analysis.effectiveDate}</span>
          </div>
        )}
        {analysis.processingTimeMs && (
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4" />
            <span>{(analysis.processingTimeMs / 1000).toFixed(1)}s analysis</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {criticalCount > 0 && <IssueBadge severity="CRITICAL" count={criticalCount} />}
        {warningCount > 0 && <IssueBadge severity="WARNING" count={warningCount} />}
        {infoCount > 0 && <IssueBadge severity="INFO" count={infoCount} />}
        {criticalCount === 0 && warningCount === 0 && infoCount === 0 && (
          <span className="text-sm text-green-500">{t("noIssues")}</span>
        )}
      </div>

      {analysis.aiProvider && (
        <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
          Analyzed with {analysis.aiProvider}/{analysis.aiModel}
        </div>
      )}
    </div>
  );
}
