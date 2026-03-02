"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles, ExternalLink, RefreshCw, Gavel, Clock, CheckCircle, MessageSquare } from "lucide-react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ExecutiveSummary } from "@/components/analysis/ExecutiveSummary";
import { generateTextSummary } from "@/lib/report-text";
import { ClauseList } from "@/components/analysis/ClauseList";
import { ClauseDetail } from "@/components/analysis/ClauseDetail";
import { IssuePanel } from "@/components/analysis/IssuePanel";
import { UploadProgress } from "@/components/upload/UploadProgress";

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const t = useTranslations("analysis");
  const tDoc = useTranslations("documents");
  const tSkill = useTranslations("skillDraft");
  const tReview = useTranslations("review");
  const documentId = params.id as string;
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const userRole = session?.user?.role;
  const isClient = userRole === "CLIENT";

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

  // Skill draft queries — only for INTERNAL and PUBLISHER
  const canGenerateSkill = userRole === "INTERNAL" || userRole === "PUBLISHER";
  const analysisId = document?.analysis?.id;
  const { data: skillDraft, refetch: refetchDraft } = trpc.skillDraft.get.useQuery(
    { analysisId: analysisId! },
    {
      enabled: canGenerateSkill && !!analysisId && document?.status === "COMPLETED",
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (!status || status === "REVIEW" || status === "EXPORTED" || status === "FAILED") return false;
        return 2000;
      },
    }
  );

  const generateSkillMutation = trpc.skillDraft.generate.useMutation({
    onSuccess: () => {
      refetchDraft();
      router.push(`/documents/${documentId}/skill-draft`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const regenerateSkillMutation = trpc.skillDraft.regenerate.useMutation({
    onSuccess: () => {
      refetchDraft();
      router.push(`/documents/${documentId}/skill-draft`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Review request — only for CLIENT role
  const { data: reviewRequest, refetch: refetchReview } = trpc.review.getByDocument.useQuery(
    { documentId },
    { enabled: isClient && !!document && document.status === "COMPLETED" }
  );

  const requestReviewMutation = trpc.review.requestReview.useMutation({
    onSuccess: () => {
      toast.success(tReview("requestSubmitted"));
      setShowReviewDialog(false);
      setReviewNotes("");
      refetchReview();
    },
    onError: (error) => {
      toast.error(error.message);
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
          {/* Document category + destination badges */}
          {analysis?.documentCategory && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${analysis.documentCategory === "assessment" ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"}`}>
              {tSkill(`type.${analysis.documentCategory}`)}
            </span>
          )}
          {analysis?.suggestedDestination && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {tSkill(`destination.${
                analysis.suggestedDestination === "deal-room" ? "DEAL_ROOM"
                : analysis.suggestedDestination === "dpo-central" ? "DPO_CENTRAL"
                : "AI_SENTINEL"
              }`)}
            </span>
          )}

          {/* Skill Draft button — hidden for CLIENT role */}
          {canGenerateSkill && analysisId && (
            <>
              {!skillDraft && (
                <button
                  onClick={() => generateSkillMutation.mutate({ analysisId })}
                  disabled={generateSkillMutation.isPending}
                  className="btn-brutal text-sm px-4 py-2 inline-flex items-center gap-2"
                >
                  {generateSkillMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {analysis?.documentCategory === "assessment"
                    ? tSkill("generateAssessmentSkill")
                    : userRole === "PUBLISHER"
                    ? tSkill("generateForMarketplace")
                    : tSkill("generateSkill")}
                </button>
              )}
              {skillDraft?.status === "GENERATING" && (
                <button
                  disabled
                  className="btn-brutal text-sm px-4 py-2 inline-flex items-center gap-2 opacity-70"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {tSkill("generatingSkill")}
                </button>
              )}
              {(skillDraft?.status === "REVIEW" || skillDraft?.status === "EXPORTED") && (
                <Link
                  href={`/documents/${documentId}/skill-draft`}
                  className="btn-brutal text-sm px-4 py-2 inline-flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  {tSkill("viewSkillDraft")}
                </Link>
              )}
              {skillDraft?.status === "FAILED" && (
                <button
                  onClick={() => regenerateSkillMutation.mutate({ analysisId })}
                  disabled={regenerateSkillMutation.isPending}
                  className="btn-brutal text-sm px-4 py-2 inline-flex items-center gap-2"
                >
                  {regenerateSkillMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {tSkill("retryGeneration")}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      <ExecutiveSummary
        analysis={analysis}
        onDownloadReport={() => router.push(`/documents/${documentId}/report`)}
        onCopyToClipboard={() => {
          const text = generateTextSummary(document, analysis);
          navigator.clipboard.writeText(text).then(() => {
            toast.success(t("copiedToClipboard"));
          });
        }}
        onReanalyze={() => reanalyzeMutation.mutate({ id: documentId })}
        onDelete={() => {
          if (confirm(tDoc("deleteConfirm"))) {
            deleteMutation.mutate({ id: documentId });
          }
        }}
        onJumpToClause={(clauseId) => setSelectedClauseId(clauseId)}
        isReanalyzing={reanalyzeMutation.isPending}
        isDeleting={deleteMutation.isPending}
      />

      {/* Review Request Section — CLIENT only */}
      {isClient && document.status === "COMPLETED" && (
        <div className="card-brutal p-5">
          {!reviewRequest || reviewRequest.status === "CANCELLED" ? (
            // No active request — show request button or dialog
            !showReviewDialog ? (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{tReview("needLawyerReview")}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{tReview("needLawyerDescription")}</p>
                </div>
                <button
                  onClick={() => setShowReviewDialog(true)}
                  className="btn-brutal text-sm px-4 py-2 inline-flex items-center gap-2"
                >
                  <Gavel className="w-4 h-4" />
                  {tReview("requestReview")}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">{tReview("requestReview")}</h3>
                <div>
                  <label className="block text-sm font-medium mb-1">{tReview("whatNeedHelp")}</label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={tReview("notesPlaceholder")}
                    rows={3}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => requestReviewMutation.mutate({
                      documentId,
                      clientNotes: reviewNotes.trim() || undefined,
                    })}
                    disabled={requestReviewMutation.isPending}
                    className="btn-brutal text-sm px-4 py-2 inline-flex items-center gap-2"
                  >
                    {requestReviewMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Gavel className="w-4 h-4" />
                    )}
                    {tReview("submitRequest")}
                  </button>
                  <button
                    onClick={() => { setShowReviewDialog(false); setReviewNotes(""); }}
                    className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-xl transition-colors"
                  >
                    {tReview("cancel")}
                  </button>
                </div>
              </div>
            )
          ) : reviewRequest.status === "PENDING" ? (
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-400">{tReview("statusPending")}</p>
                <p className="text-xs text-muted-foreground">{tReview("statusPendingDescription")}</p>
              </div>
            </div>
          ) : reviewRequest.status === "CLAIMED" ? (
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-400">{tReview("statusClaimed")}</p>
                <p className="text-xs text-muted-foreground">{tReview("statusClaimedDescription")}</p>
              </div>
            </div>
          ) : reviewRequest.status === "COMPLETED" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-400">{tReview("statusCompleted")}</p>
                  <p className="text-xs text-muted-foreground">{tReview("statusCompletedDescription")}</p>
                </div>
              </div>
              {reviewRequest.reviewNotes && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                  <h4 className="section-label mb-2">{tReview("lawyerNotes")}</h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{reviewRequest.reviewNotes}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

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
