"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, Layers, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";

const STATUS_COLORS: Record<string, string> = {
  GENERATING: "bg-muted text-muted-foreground",
  REVIEW: "bg-amber-500/10 text-amber-500",
  SUBMITTED: "bg-blue-500/10 text-blue-500",
  APPROVED: "bg-green-500/10 text-green-500",
  REJECTED: "bg-red-500/10 text-red-500",
  EXPORTED: "bg-primary/10 text-primary",
  FAILED: "bg-red-500/10 text-red-500",
};

export default function MySkillsPage() {
  const t = useTranslations("mySkills");
  const tSkill = useTranslations("skillDraft");

  const { data: skills, isLoading } = trpc.skillDraft.listMine.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      {!skills || skills.length === 0 ? (
        <div className="card-brutal text-center py-16">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">{t("noSkillsYet")}</h2>
          <p className="text-sm text-muted-foreground mb-6">{t("noSkillsDescription")}</p>
          <Link href="/documents" className="btn-brutal inline-flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {t("goToDocuments")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <Link
              key={skill.id}
              href={`/documents/${skill.analysis.document.id}/skill-draft`}
              className="card-brutal p-5 space-y-3 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm leading-tight">
                  {skill.displayName || skill.contractType || "Untitled"}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLORS[skill.status] || ""}`}>
                  {tSkill(`status.${skill.status}`)}
                </span>
              </div>
              {skill.contractType && (
                <span className="tag-accent text-xs">{skill.contractType}</span>
              )}
              <p className="text-xs text-muted-foreground">
                {skill.analysis.document.fileName}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {new Date(skill.createdAt).toLocaleDateString()}
                </span>
                {skill.submittedAt && (
                  <span>{t("submittedOn", { date: new Date(skill.submittedAt).toLocaleDateString() })}</span>
                )}
              </div>
              {skill.status === "REJECTED" && skill.reviewNotes && (
                <div className="text-xs bg-red-500/5 border border-red-500/20 rounded-lg p-2 text-red-400">
                  {skill.reviewNotes}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
