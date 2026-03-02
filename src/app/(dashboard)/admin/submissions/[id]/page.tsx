"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, CheckCircle, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-500/10 text-blue-500",
  APPROVED: "bg-green-500/10 text-green-500",
  REJECTED: "bg-red-500/10 text-red-500",
};

export default function SubmissionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("admin");
  const tSkill = useTranslations("skillDraft");
  const submissionId = params.id as string;
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState<"APPROVED" | "REJECTED" | null>(null);

  const { data: submission, isLoading } = trpc.admin.getSubmission.useQuery({ id: submissionId });

  const reviewMutation = trpc.admin.reviewSubmission.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.status === "APPROVED" ? t("submissionApproved") : t("submissionRejected")
      );
      router.push("/admin/submissions");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleReview = (reviewAction: "APPROVED" | "REJECTED") => {
    if (reviewAction === "REJECTED" && !notes.trim()) {
      toast.error(t("notesRequired"));
      return;
    }
    reviewMutation.mutate({
      id: submissionId,
      action: reviewAction,
      notes: notes.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">{t("submissionNotFound")}</p>
        <Link href="/admin/submissions" className="text-primary hover:underline mt-4 inline-block">
          {t("backToSubmissions")}
        </Link>
      </div>
    );
  }

  const isAssessment = submission.skillType === "ASSESSMENT";
  const clausesJson = submission.clausesJson as Record<string, unknown> | null;
  const clauseCount = clausesJson && Array.isArray((clausesJson as { clauses?: unknown[] }).clauses)
    ? (clausesJson as { clauses: unknown[] }).clauses.length
    : 0;
  const assessmentJson = submission.assessmentJson as {
    assessmentType?: string;
    scoringMethod?: string;
    categories?: Array<{ criteria: unknown[] }>;
  } | null;
  const categoryCount = assessmentJson?.categories?.length || 0;
  const criteriaCount = assessmentJson?.categories?.reduce(
    (sum: number, cat: { criteria: unknown[] }) => sum + cat.criteria.length, 0
  ) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/submissions"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {submission.displayName || submission.contractType || "Untitled"}
            </h1>
            <p className="text-sm text-muted-foreground">{t("reviewSubmission")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[submission.status] || ""}`}>
            {tSkill(`status.${submission.status}`)}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${submission.skillType === "ASSESSMENT" ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"}`}>
            {tSkill(`type.${submission.skillType === "ASSESSMENT" ? "assessment" : "contract"}`)}
          </span>
          {submission.destination && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {tSkill(`destination.${submission.destination}`)}
            </span>
          )}
        </div>
      </div>

      {/* Submission info */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-brutal p-5 space-y-3">
          <h3 className="section-label">{t("submissionDetails")}</h3>
          <InfoRow label={t("publisher")} value={submission.analysis.document.user.email} />
          {submission.analysis.document.user.name && (
            <InfoRow label={t("publisherName")} value={submission.analysis.document.user.name} />
          )}
          <InfoRow label={t("sourceDocument")} value={submission.analysis.document.fileName} />
          <InfoRow label={t("contractType")} value={submission.contractType || "—"} />
          {isAssessment ? (
            <>
              <InfoRow label="Categories" value={String(categoryCount)} />
              <InfoRow label="Criteria" value={String(criteriaCount)} />
              {assessmentJson?.scoringMethod && (
                <InfoRow label="Scoring Method" value={assessmentJson.scoringMethod} />
              )}
            </>
          ) : (
            <InfoRow label={t("clauseCount")} value={String(clauseCount)} />
          )}
          {submission.submittedAt && (
            <InfoRow label={t("submittedDate", { date: "" })} value={new Date(submission.submittedAt).toLocaleString()} />
          )}
        </div>

        <div className="card-brutal p-5 space-y-3">
          <h3 className="section-label">{t("analysisOverview")}</h3>
          <InfoRow label={t("contractType")} value={submission.analysis.contractType || "—"} />
          <InfoRow label={t("totalClauses")} value={String(submission.analysis.clauses.length)} />
          <InfoRow label={t("totalIssues")} value={String(submission.analysis.issues.length)} />
          <Link
            href={`/documents/${submission.analysis.document.id}/skill-draft`}
            className="text-sm text-primary hover:underline inline-block mt-2"
          >
            {t("viewFullDraft")}
          </Link>
        </div>
      </div>

      {/* Previous review notes */}
      {submission.reviewNotes && submission.status !== "SUBMITTED" && (
        <div className="card-brutal p-5">
          <h3 className="section-label mb-2">{t("previousReviewNotes")}</h3>
          <p className="text-sm text-muted-foreground">{submission.reviewNotes}</p>
        </div>
      )}

      {/* Review action area — only for SUBMITTED status */}
      {submission.status === "SUBMITTED" && (
        <div className="card-brutal p-5 space-y-4">
          <h3 className="section-label">{t("reviewAction")}</h3>

          <div>
            <label className="block text-sm font-medium mb-2">{t("reviewNotes")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("reviewNotesPlaceholder")}
              rows={4}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">{t("notesRequiredForReject")}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleReview("APPROVED")}
              disabled={reviewMutation.isPending}
              className="flex-1 btn-brutal inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 border-green-600"
            >
              {reviewMutation.isPending && action === "APPROVED" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {t("approve")}
            </button>
            <button
              onClick={() => handleReview("REJECTED")}
              disabled={reviewMutation.isPending}
              className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl inline-flex items-center justify-center gap-2 transition-colors"
            >
              {reviewMutation.isPending && action === "REJECTED" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {t("reject")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}:</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
