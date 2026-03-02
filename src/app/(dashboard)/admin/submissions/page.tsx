"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, ArrowLeft, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-500/10 text-blue-500",
  APPROVED: "bg-green-500/10 text-green-500",
  REJECTED: "bg-red-500/10 text-red-500",
};

type FilterStatus = "SUBMITTED" | "APPROVED" | "REJECTED" | "ALL";

export default function AdminSubmissionsPage() {
  const t = useTranslations("admin");
  const tSkill = useTranslations("skillDraft");
  const [filter, setFilter] = useState<FilterStatus>("SUBMITTED");

  const { data: submissions, isLoading } = trpc.admin.listSubmissions.useQuery(
    { status: filter }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t("submissions")}</h1>
          <p className="text-muted-foreground text-sm">{t("submissionsSubtitle")}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-0">
        {(["SUBMITTED", "APPROVED", "REJECTED", "ALL"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`tab-brutal ${filter === status ? "tab-brutal-active" : ""}`}
          >
            {status === "ALL" ? t("all") : tSkill(`status.${status}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !submissions || submissions.length === 0 ? (
        <div className="card-brutal text-center py-12">
          <p className="text-muted-foreground">{t("noSubmissions")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <Link
              key={sub.id}
              href={`/admin/submissions/${sub.id}`}
              className="card-brutal p-4 flex items-center gap-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm truncate">
                    {sub.displayName || sub.contractType || "Untitled"}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLORS[sub.status] || ""}`}>
                    {tSkill(`status.${sub.status}`)}
                  </span>
                  {/* Skill type badge */}
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${sub.skillType === "ASSESSMENT" ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"}`}>
                    {tSkill(`type.${sub.skillType === "ASSESSMENT" ? "assessment" : "contract"}`)}
                  </span>
                  {/* Destination badge */}
                  {sub.destination && (
                    <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap bg-primary/10 text-primary">
                      {tSkill(`destination.${sub.destination}`)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {sub.analysis.document.user.email} &middot;{" "}
                  {sub.analysis.document.fileName}
                </p>
                {sub.submittedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("submittedDate", { date: new Date(sub.submittedAt).toLocaleDateString() })}
                  </p>
                )}
              </div>
              <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
