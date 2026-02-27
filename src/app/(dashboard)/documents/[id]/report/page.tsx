"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { computeRiskScore } from "@/lib/risk-score";
import { ReportHeader } from "@/components/report/ReportHeader";
import { ReportIssuesTable } from "@/components/report/ReportIssuesTable";
import { ReportClauseSection } from "@/components/report/ReportClauseSection";

export default function ReportPage() {
  const params = useParams();
  const t = useTranslations("report");
  const tAnalysis = useTranslations("analysis");
  const documentId = params.id as string;

  const { data: document, isLoading } = trpc.document.getById.useQuery(
    { id: documentId },
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!document || !document.analysis) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">Document not found</p>
        <Link href="/documents" className="text-primary hover:underline mt-4 inline-block">
          Back to documents
        </Link>
      </div>
    );
  }

  const analysis = document.analysis;
  const risk = computeRiskScore(analysis.issues);
  const criticalCount = analysis.issues.filter((i) => i.severity === "CRITICAL").length;
  const warningCount = analysis.issues.filter((i) => i.severity === "WARNING").length;
  const infoCount = analysis.issues.filter((i) => i.severity === "INFO").length;
  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const riskLabelText = {
    LOW: tAnalysis("riskLow"),
    MODERATE: tAnalysis("riskModerate"),
    HIGH: tAnalysis("riskHigh"),
    CRITICAL: tAnalysis("riskCritical"),
  }[risk.label];

  const riskColor = {
    LOW: "text-green-700",
    MODERATE: "text-yellow-700",
    HIGH: "text-orange-700",
    CRITICAL: "text-red-700",
  }[risk.label];

  return (
    <div>
      {/* Action bar - hidden in print */}
      <div className="no-print flex items-center justify-between mb-6">
        <Link
          href={`/documents/${documentId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToAnalysis")}
        </Link>
        <button
          onClick={() => window.print()}
          className="btn-brutal text-sm px-4 py-2 inline-flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          {t("printReport")}
        </button>
      </div>

      {/* Report body - light theme for print */}
      <div className="print-report bg-white text-gray-900 rounded-2xl p-8 lg:p-12 max-w-4xl mx-auto">
        <ReportHeader documentName={document.fileName} generatedDate={generatedDate} />

        {/* Classification */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
            {t("classification")}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {analysis.contractTypeLabel && (
              <div>
                <span className="font-medium text-gray-500">{tAnalysis("contractType")}</span>
                <div className="text-gray-900">{analysis.contractTypeLabel}</div>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-500">{tAnalysis("jurisdiction")}</span>
              <div className="text-gray-900">{analysis.jurisdiction}</div>
            </div>
            {analysis.partyNames.length > 0 && (
              <div>
                <span className="font-medium text-gray-500">{tAnalysis("parties")}</span>
                <div className="text-gray-900">{analysis.partyNames.join(", ")}</div>
              </div>
            )}
            {analysis.effectiveDate && (
              <div>
                <span className="font-medium text-gray-500">{tAnalysis("effectiveDate")}</span>
                <div className="text-gray-900">{analysis.effectiveDate}</div>
              </div>
            )}
          </div>
        </section>

        {/* Executive Summary */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
            {t("executiveSummary")}
          </h2>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{analysis.clauses.length}</div>
              <div className="text-xs text-gray-500">{tAnalysis("totalClauses")}</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
              <div className="text-xs text-gray-500">{tAnalysis("critical")}</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
              <div className="text-xs text-gray-500">{tAnalysis("warning")}</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-3 text-center">
              <div className={`text-2xl font-bold ${riskColor}`}>{riskLabelText}</div>
              <div className="text-xs text-gray-500">{tAnalysis("riskLevel")} ({risk.score}/100)</div>
            </div>
          </div>

          {analysis.summary && (
            <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
          )}
        </section>

        {/* Issues Overview */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
            {t("issuesOverview")} ({analysis.issues.length})
          </h2>
          <ReportIssuesTable issues={analysis.issues} />
        </section>

        {/* Clause Breakdown */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
            {t("clauseBreakdown")} ({analysis.clauses.length})
          </h2>
          <ReportClauseSection clauses={analysis.clauses} />
        </section>

        {/* Footer */}
        <footer className="border-t-2 border-amber-500 pt-4 mt-12 text-center text-xs text-gray-400">
          <div>{t("generatedBy")} Clausemaster | todo.law</div>
          <div>{generatedDate}</div>
          <div className="mt-1">{t("confidential")}</div>
        </footer>
      </div>
    </div>
  );
}
