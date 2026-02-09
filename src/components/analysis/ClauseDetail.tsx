"use client";

import { useTranslations } from "next-intl";
import { FileText, Scale, BookOpen, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClauseDetailProps {
  clause: {
    id: string;
    order: number;
    title: string;
    category?: string | null;
    originalText: string;
    summary?: string | null;
    legalSignificance?: string | null;
    skillClauseMatch?: string | null;
    biasAssessment: string;
    issues: Array<{
      id: string;
      type: string;
      severity: string;
      title: string;
      description: string;
    }>;
  };
}

export function ClauseDetail({ clause }: ClauseDetailProps) {
  const t = useTranslations("analysis");

  const biasLabel = {
    NEUTRAL: t("neutral"),
    FAVORS_PARTY_A: t("favorsPartyA"),
    FAVORS_PARTY_B: t("favorsPartyB"),
  }[clause.biasAssessment] || t("neutral");

  const biasColor = {
    NEUTRAL: "text-green-400",
    FAVORS_PARTY_A: "text-yellow-400",
    FAVORS_PARTY_B: "text-yellow-400",
  }[clause.biasAssessment] || "text-green-400";

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs text-muted-foreground font-mono">#{clause.order}</span>
          <h2 className="text-xl font-bold">{clause.title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {clause.category && (
            <Badge variant="secondary">{clause.category}</Badge>
          )}
          <div className={`flex items-center gap-1 text-xs ${biasColor}`}>
            <Scale className="w-3.5 h-3.5" />
            {biasLabel}
          </div>
          {clause.skillClauseMatch && (
            <div className="flex items-center gap-1 text-xs text-primary">
              <Link2 className="w-3.5 h-3.5" />
              {clause.skillClauseMatch}
            </div>
          )}
        </div>
      </div>

      {clause.summary && (
        <div>
          <h3 className="section-label mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {t("clauseSummary")}
          </h3>
          <p className="text-foreground">{clause.summary}</p>
        </div>
      )}

      <div>
        <h3 className="section-label mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          {t("originalText")}
        </h3>
        <div className="bg-background/50 border border-border rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {clause.originalText}
        </div>
      </div>

      {clause.legalSignificance && (
        <div>
          <h3 className="section-label mb-2">{t("legalSignificance")}</h3>
          <p className="text-muted-foreground text-sm">{clause.legalSignificance}</p>
        </div>
      )}

      {clause.issues.length > 0 && (
        <div>
          <h3 className="section-label mb-3">{t("issues")} ({clause.issues.length})</h3>
          <div className="space-y-3">
            {clause.issues.map((issue) => (
              <div
                key={issue.id}
                className={`p-3 rounded-xl border ${
                  issue.severity === "CRITICAL"
                    ? "border-red-500/30 bg-red-500/5"
                    : issue.severity === "WARNING"
                    ? "border-yellow-500/30 bg-yellow-500/5"
                    : "border-blue-500/30 bg-blue-500/5"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={issue.severity === "CRITICAL" ? "destructive" : "secondary"} className="text-xs">
                    {issue.severity}
                  </Badge>
                  <span className="text-sm font-medium">{issue.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{issue.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
