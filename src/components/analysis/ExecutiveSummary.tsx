"use client";

import { useTranslations } from "next-intl";
import {
  Calendar,
  Users,
  Scale,
  AlertTriangle,
  AlertCircle,
  Info,
  Download,
  Copy,
  RefreshCw,
  ChevronRight,
  Shield,
  FileText,
  Trash2,
} from "lucide-react";
import { ContractTypeBadge } from "./ContractTypeBadge";
import { JurisdictionBadge } from "./JurisdictionBadge";
import { computeRiskScore } from "@/lib/risk-score";

interface Issue {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  recommendation?: string | null;
  relatedClauseTitle?: string | null;
  clauseId?: string | null;
}

interface Clause {
  id: string;
  title: string;
}

interface ExecutiveSummaryProps {
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
    issues: Issue[];
    clauses: Clause[];
  };
  onDownloadReport: () => void;
  onCopyToClipboard: () => void;
  onReanalyze: () => void;
  onDelete: () => void;
  onJumpToClause: (clauseId: string) => void;
  isReanalyzing?: boolean;
  isDeleting?: boolean;
}

const SEVERITY_ORDER = { CRITICAL: 0, WARNING: 1, INFO: 2 } as const;

export function ExecutiveSummary({
  analysis,
  onDownloadReport,
  onCopyToClipboard,
  onReanalyze,
  onDelete,
  onJumpToClause,
  isReanalyzing,
  isDeleting,
}: ExecutiveSummaryProps) {
  const t = useTranslations("analysis");

  const criticalCount = analysis.issues.filter((i) => i.severity === "CRITICAL").length;
  const warningCount = analysis.issues.filter((i) => i.severity === "WARNING").length;
  const infoCount = analysis.issues.filter((i) => i.severity === "INFO").length;
  const risk = computeRiskScore(analysis.issues);

  const riskLabelText = {
    LOW: t("riskLow"),
    MODERATE: t("riskModerate"),
    HIGH: t("riskHigh"),
    CRITICAL: t("riskCritical"),
  }[risk.label];

  const riskBorderHex = {
    LOW: "#22c55e",
    MODERATE: "#eab308",
    HIGH: "#f97316",
    CRITICAL: "#ef4444",
  }[risk.label];

  // Top findings: sorted by severity, take up to 5
  const topFindings = [...analysis.issues]
    .sort((a, b) => {
      return (SEVERITY_ORDER[a.severity as keyof typeof SEVERITY_ORDER] ?? 3) -
        (SEVERITY_ORDER[b.severity as keyof typeof SEVERITY_ORDER] ?? 3);
    })
    .slice(0, 5);

  return (
    <div className="card-brutal space-y-6">
      {/* Classification row */}
      <div className="flex flex-wrap items-center gap-3">
        {analysis.contractTypeLabel && (
          <ContractTypeBadge type={analysis.contractType || ""} label={analysis.contractTypeLabel} />
        )}
        <JurisdictionBadge jurisdiction={analysis.jurisdiction} />
      </div>

      {/* Summary text */}
      {analysis.summary && (
        <p className="text-foreground">{analysis.summary}</p>
      )}

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
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

      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="section-label mb-1">{t("totalClauses")}</div>
          <div className="metric-lg">{analysis.clauses.length}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: "#ef4444" }}>
          <div className="section-label mb-1">{t("critical")}</div>
          <div className="metric-lg text-red-400">{criticalCount}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: "#eab308" }}>
          <div className="section-label mb-1">{t("warning")}</div>
          <div className="metric-lg text-yellow-400">{warningCount}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: riskBorderHex }}>
          <div className="section-label mb-1">{t("riskLevel")}</div>
          <div className={`metric-lg ${risk.color}`}>{riskLabelText}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{risk.score}/100</div>
        </div>
      </div>

      {/* Top Findings */}
      {topFindings.length > 0 && (
        <div>
          <h3 className="section-label mb-3">{t("topFindings")}</h3>
          <div className="space-y-2">
            {topFindings.map((issue) => {
              const severityConfig = {
                CRITICAL: {
                  icon: AlertTriangle,
                  bg: "bg-red-500/5",
                  border: "border-red-500/30",
                  text: "text-red-400",
                },
                WARNING: {
                  icon: AlertCircle,
                  bg: "bg-yellow-500/5",
                  border: "border-yellow-500/30",
                  text: "text-yellow-400",
                },
                INFO: {
                  icon: Info,
                  bg: "bg-blue-500/5",
                  border: "border-blue-500/30",
                  text: "text-blue-400",
                },
              }[issue.severity] || {
                icon: Info,
                bg: "bg-muted",
                border: "border-border",
                text: "text-muted-foreground",
              };

              const Icon = severityConfig.icon;

              return (
                <div
                  key={issue.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${severityConfig.bg} ${severityConfig.border}`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${severityConfig.text}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{issue.title}</span>
                      <span className={`text-xs ${severityConfig.text}`}>{issue.severity}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{issue.description}</p>
                  </div>
                  {issue.clauseId && (
                    <button
                      onClick={() => onJumpToClause(issue.clauseId!)}
                      className="shrink-0 text-xs text-primary hover:underline flex items-center gap-0.5"
                    >
                      {t("jumpToClause")}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {topFindings.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-green-500/30 bg-green-500/5">
          <Shield className="w-5 h-5 text-green-400" />
          <div>
            <span className="text-sm font-medium text-green-400">{t("noIssues")}</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("riskLow")}
            </p>
          </div>
        </div>
      )}

      {/* Action buttons row */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
        <button
          onClick={onDownloadReport}
          className="btn-brutal text-sm px-4 py-2 inline-flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          {t("downloadReport")}
        </button>
        <button
          onClick={onCopyToClipboard}
          className="btn-brutal-outline text-sm px-4 py-2 inline-flex items-center gap-2"
        >
          <Copy className="w-4 h-4" />
          {t("copySummary")}
        </button>
        <button
          onClick={onReanalyze}
          disabled={isReanalyzing}
          className="btn-brutal-outline text-sm px-4 py-2 inline-flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isReanalyzing ? "animate-spin" : ""}`} />
          {t("reanalyze")}
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-destructive/10 ml-auto"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* AI footer */}
      {analysis.aiProvider && (
        <div className="text-xs text-muted-foreground">
          Analyzed with {analysis.aiProvider}/{analysis.aiModel}
        </div>
      )}
    </div>
  );
}
