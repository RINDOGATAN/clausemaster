"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AnalysisSummary } from "@/components/analysis/AnalysisSummary";
import { ClauseList } from "@/components/analysis/ClauseList";
import { ClauseDetail } from "@/components/analysis/ClauseDetail";
import { IssuePanel } from "@/components/analysis/IssuePanel";
import { UploadProgress } from "@/components/upload/UploadProgress";

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("analysis");
  const tDoc = useTranslations("documents");
  const documentId = params.id as string;
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);

  const { data: document, isLoading, refetch } = trpc.document.getById.useQuery(
    { id: documentId },
    {
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (status === "COMPLETED" || status === "FAILED") return false;
        return 2000;
      },
    }
  );

  const deleteMutation = trpc.document.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      router.push("/documents");
    },
  });

  const reanalyzeMutation = trpc.document.reanalyze.useMutation({
    onSuccess: () => {
      toast.success("Re-analysis started");
      refetch();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">Document not found</p>
        <Link href="/documents" className="text-primary hover:underline mt-4 inline-block">
          Back to documents
        </Link>
      </div>
    );
  }

  // Show progress for in-progress analysis
  const isAnalyzing = document.status === "UPLOADED" || document.status === "EXTRACTING" || document.status === "ANALYZING";
  if (isAnalyzing) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <Link
          href="/documents"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to documents
        </Link>
        <UploadProgress documentId={documentId} />
      </div>
    );
  }

  // Show error state
  if (document.status === "FAILED") {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <Link
          href="/documents"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to documents
        </Link>
        <div className="card-brutal text-center py-12">
          <h2 className="text-xl font-bold text-destructive mb-2">{tDoc("failed")}</h2>
          <p className="text-muted-foreground mb-6">{document.errorMessage || "Analysis failed. Please try again."}</p>
          <button
            onClick={() => reanalyzeMutation.mutate({ id: documentId })}
            disabled={reanalyzeMutation.isPending}
            className="btn-brutal inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {tDoc("reanalyze")}
          </button>
        </div>
      </div>
    );
  }

  const analysis = document.analysis;
  if (!analysis) {
    return null;
  }

  const selectedClause = selectedClauseId
    ? analysis.clauses.find((c) => c.id === selectedClauseId)
    : analysis.clauses[0] || null;

  // Auto-select first clause
  if (!selectedClauseId && analysis.clauses.length > 0) {
    setSelectedClauseId(analysis.clauses[0].id);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{document.fileName}</h1>
            <p className="text-sm text-muted-foreground">{t("analysisResults")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => reanalyzeMutation.mutate({ id: documentId })}
            disabled={reanalyzeMutation.isPending}
            className="btn-brutal-outline text-sm px-4 py-2 inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${reanalyzeMutation.isPending ? "animate-spin" : ""}`} />
            {tDoc("reanalyze")}
          </button>
          <button
            onClick={() => {
              if (confirm(tDoc("deleteConfirm"))) {
                deleteMutation.mutate({ id: documentId });
              }
            }}
            disabled={deleteMutation.isPending}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Analysis Summary */}
      <AnalysisSummary analysis={analysis} />

      {/* 3-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-4 min-h-[600px]">
        {/* Left: Clause Navigation */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-border">
            <h3 className="section-label">{t("clauses")}</h3>
          </div>
          <ClauseList
            clauses={analysis.clauses}
            selectedClauseId={selectedClauseId}
            onSelectClause={setSelectedClauseId}
          />
        </div>

        {/* Center: Clause Detail */}
        <div className="bg-card border border-border rounded-2xl overflow-y-auto">
          <div className="p-3 border-b border-border">
            <h3 className="section-label">{t("clauseDetail")}</h3>
          </div>
          {selectedClause ? (
            <ClauseDetail clause={selectedClause} />
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              Select a clause to view details
            </div>
          )}
        </div>

        {/* Right: Issues */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-border">
            <h3 className="section-label">{t("issues")}</h3>
          </div>
          <IssuePanel
            issues={analysis.issues}
            onSelectClause={(clauseId) => setSelectedClauseId(clauseId)}
          />
        </div>
      </div>
    </div>
  );
}
