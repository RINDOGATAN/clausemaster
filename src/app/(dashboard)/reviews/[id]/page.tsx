"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Loader2, Send, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ClauseList } from "@/components/analysis/ClauseList";
import { ClauseDetail } from "@/components/analysis/ClauseDetail";
import { IssuePanel } from "@/components/analysis/IssuePanel";

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("review");
  const tAnalysis = useTranslations("analysis");
  const reviewId = params.id as string;
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: review, isLoading } = trpc.review.getReviewAnalysis.useQuery(
    { id: reviewId },
  );

  const completeMutation = trpc.review.complete.useMutation({
    onSuccess: () => {
      toast.success(t("reviewCompleted"));
      router.push("/reviews");
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

  if (!review) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">{t("reviewNotFound")}</p>
        <Link href="/reviews" className="text-primary hover:underline mt-4 inline-block">
          {t("backToReviews")}
        </Link>
      </div>
    );
  }

  const analysis = review.document.analysis;
  if (!analysis) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">{t("noAnalysis")}</p>
      </div>
    );
  }

  const selectedClause = selectedClauseId
    ? analysis.clauses.find((c) => c.id === selectedClauseId)
    : analysis.clauses[0] || null;

  if (!selectedClauseId && analysis.clauses.length > 0) {
    setSelectedClauseId(analysis.clauses[0].id);
  }

  const contractLabel = analysis.contractTypeLabel || analysis.contractType || review.document.fileName;
  const isClaimed = review.status === "CLAIMED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/reviews"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{contractLabel}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>{review.document.fileName}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                review.status === "CLAIMED" ? "bg-amber-500/10 text-amber-500" :
                review.status === "COMPLETED" ? "bg-green-500/10 text-green-500" :
                "bg-muted text-muted-foreground"
              }`}>
                {t(`status.${review.status}`)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Client notes */}
      {review.clientNotes && (
        <div className="bg-secondary/30 border border-border rounded-xl p-4">
          <h3 className="section-label mb-2">{t("clientNotes")}</h3>
          <p className="text-sm text-foreground italic">&ldquo;{review.clientNotes}&rdquo;</p>
        </div>
      )}

      {/* 3-Panel Layout (read-only analysis) */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-4 min-h-[600px]">
        {/* Left: Clause Navigation */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-border">
            <h3 className="section-label">{tAnalysis("clauses")}</h3>
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
            <h3 className="section-label">{tAnalysis("clauseDetail")}</h3>
          </div>
          {selectedClause ? (
            <ClauseDetail clause={selectedClause} />
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              {t("selectClause")}
            </div>
          )}
        </div>

        {/* Right: Issues */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-border">
            <h3 className="section-label">{tAnalysis("issues")}</h3>
          </div>
          <IssuePanel
            issues={analysis.issues}
            onSelectClause={(clauseId) => setSelectedClauseId(clauseId)}
          />
        </div>
      </div>

      {/* Review Notes + Complete */}
      {isClaimed && (
        <div className="card-brutal p-5 space-y-4">
          <h3 className="font-semibold text-sm">{t("writeReviewNotes")}</h3>
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder={t("reviewNotesPlaceholder")}
            rows={6}
            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{t("reviewNotesHint")}</p>
            <button
              onClick={() => {
                if (!reviewNotes.trim()) {
                  toast.error(t("notesRequired"));
                  return;
                }
                completeMutation.mutate({ id: reviewId, reviewNotes: reviewNotes.trim() });
              }}
              disabled={completeMutation.isPending}
              className="btn-brutal text-sm px-4 py-2 inline-flex items-center gap-2"
            >
              {completeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {t("completeReview")}
            </button>
          </div>
        </div>
      )}

      {/* Completed review notes (read-only) */}
      {review.status === "COMPLETED" && review.reviewNotes && (
        <div className="card-brutal p-5">
          <h3 className="font-semibold text-sm mb-3">{t("yourReviewNotes")}</h3>
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">{review.reviewNotes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
