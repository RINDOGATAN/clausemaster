"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, AlertCircle, Info, Filter } from "lucide-react";
import { IssueBadge } from "./IssueBadge";

interface Issue {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  recommendation?: string | null;
  jurisdictionNote?: string | null;
  clauseId?: string | null;
  clause?: { title: string } | null;
}

interface IssuePanelProps {
  issues: Issue[];
  onSelectClause?: (clauseId: string) => void;
}

export function IssuePanel({ issues, onSelectClause }: IssuePanelProps) {
  const t = useTranslations("analysis");
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);

  const filteredIssues = severityFilter
    ? issues.filter((i) => i.severity === severityFilter)
    : issues;

  const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length;
  const warningCount = issues.filter((i) => i.severity === "WARNING").length;
  const infoCount = issues.filter((i) => i.severity === "INFO").length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />;
      case "WARNING":
        return <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />;
      case "INFO":
        return <Info className="w-4 h-4 text-blue-400 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t("filterBySeverity")}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSeverityFilter(null)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              !severityFilter ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("allSeverities")} ({issues.length})
          </button>
          {criticalCount > 0 && (
            <button
              onClick={() => setSeverityFilter(severityFilter === "CRITICAL" ? null : "CRITICAL")}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                severityFilter === "CRITICAL" ? "bg-red-500/20 text-red-400" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("critical")} ({criticalCount})
            </button>
          )}
          {warningCount > 0 && (
            <button
              onClick={() => setSeverityFilter(severityFilter === "WARNING" ? null : "WARNING")}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                severityFilter === "WARNING" ? "bg-yellow-500/20 text-yellow-400" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("warning")} ({warningCount})
            </button>
          )}
          {infoCount > 0 && (
            <button
              onClick={() => setSeverityFilter(severityFilter === "INFO" ? null : "INFO")}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                severityFilter === "INFO" ? "bg-blue-500/20 text-blue-400" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("info")} ({infoCount})
            </button>
          )}
        </div>
      </div>

      {/* Issues list */}
      <div className="flex-1 overflow-y-auto">
        {filteredIssues.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {t("noIssues")}
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className="p-3 border-b border-border/50 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-start gap-2 mb-1">
                {getSeverityIcon(issue.severity)}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium">{issue.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {issue.description}
                  </p>
                  {issue.recommendation && (
                    <p className="text-xs text-primary mt-1.5">
                      {t("recommendation")}: {issue.recommendation}
                    </p>
                  )}
                  {issue.clause && issue.clauseId && (
                    <button
                      onClick={() => onSelectClause?.(issue.clauseId!)}
                      className="text-xs text-primary hover:underline mt-1"
                    >
                      {issue.clause.title}
                    </button>
                  )}
                  {issue.jurisdictionNote && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      {issue.jurisdictionNote}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-border text-xs text-muted-foreground">
        {t("issueCount", { count: filteredIssues.length })}
      </div>
    </div>
  );
}
