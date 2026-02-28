"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, Scale, FileText, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Tab = "available" | "mine";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-blue-500/10 text-blue-500",
  CLAIMED: "bg-amber-500/10 text-amber-500",
  COMPLETED: "bg-green-500/10 text-green-500",
  CANCELLED: "bg-muted text-muted-foreground",
};

export default function ReviewsPage() {
  const t = useTranslations("review");
  const [tab, setTab] = useState<Tab>("available");

  const { data: available, isLoading: availableLoading } = trpc.review.listAvailable.useQuery(
    undefined,
    { enabled: tab === "available" }
  );
  const { data: mine, isLoading: mineLoading, refetch: refetchMine } = trpc.review.listMine.useQuery(
    undefined,
    { enabled: tab === "mine" }
  );

  const claimMutation = trpc.review.claim.useMutation({
    onSuccess: () => {
      toast.success(t("claimed"));
      setTab("mine");
      refetchMine();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isLoading = tab === "available" ? availableLoading : mineLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-0">
        <button
          onClick={() => setTab("available")}
          className={`tab-brutal ${tab === "available" ? "tab-brutal-active" : ""}`}
        >
          {t("available")} {available && available.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
              {available.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`tab-brutal ${tab === "mine" ? "tab-brutal-active" : ""}`}
        >
          {t("myReviews")}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : tab === "available" ? (
        // Available reviews
        !available || available.length === 0 ? (
          <div className="card-brutal text-center py-12">
            <Scale className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t("noAvailable")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {available.map((req) => {
              const analysis = req.document.analysis;
              const clauseCount = analysis?.clauses.length ?? 0;
              const issueCount = analysis?.issues.length ?? 0;
              const criticalCount = analysis?.issues.filter((i) => i.severity === "CRITICAL").length ?? 0;

              return (
                <div key={req.id} className="card-brutal p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-sm">
                          {analysis?.contractTypeLabel || analysis?.contractType || t("unknownType")}
                        </span>
                        {analysis?.jurisdiction && analysis.jurisdiction !== "UNKNOWN" && (
                          <span className="tag text-xs">{analysis.jurisdiction}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{clauseCount} {t("clauses")}</span>
                        <span>{issueCount} {t("issues")}</span>
                        {criticalCount > 0 && (
                          <span className="text-red-400">{criticalCount} {t("critical")}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => claimMutation.mutate({ id: req.id })}
                      disabled={claimMutation.isPending}
                      className="btn-brutal text-sm px-4 py-2 inline-flex items-center gap-2 shrink-0"
                    >
                      {claimMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                      {t("claimReview")}
                    </button>
                  </div>
                  {req.clientNotes && (
                    <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-2 italic">
                      &ldquo;{req.clientNotes}&rdquo;
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t("requestedOn", { date: new Date(req.createdAt).toLocaleDateString() })}
                  </p>
                </div>
              );
            })}
          </div>
        )
      ) : (
        // My reviews
        !mine || mine.length === 0 ? (
          <div className="card-brutal text-center py-12">
            <p className="text-muted-foreground">{t("noMyReviews")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mine.map((req) => (
              <Link
                key={req.id}
                href={`/reviews/${req.id}`}
                className="card-brutal p-4 flex items-center gap-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">
                      {req.document.analysis?.contractTypeLabel || req.document.analysis?.contractType || req.document.fileName}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLORS[req.status] || ""}`}>
                      {t(`status.${req.status}`)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{req.document.fileName}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
