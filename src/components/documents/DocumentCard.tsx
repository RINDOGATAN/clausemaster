"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { Loader2, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { FileTypeIcon } from "@/components/upload/FileTypeIcon";

interface DocumentCardProps {
  document: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    status: string;
    createdAt: string | Date;
    analysis?: {
      contractType?: string | null;
      contractTypeLabel?: string | null;
      jurisdiction?: string;
      _count?: { clauses: number; issues: number };
      issues?: { severity: string }[];
    } | null;
  };
}

export function DocumentCard({ document: doc }: DocumentCardProps) {
  const t = useTranslations("documents");

  const criticalCount = doc.analysis?.issues?.filter((i) => i.severity === "CRITICAL").length || 0;
  const warningCount = doc.analysis?.issues?.filter((i) => i.severity === "WARNING").length || 0;
  const infoCount = doc.analysis?.issues?.filter((i) => i.severity === "INFO").length || 0;

  const isAnalyzing = doc.status === "UPLOADED" || doc.status === "EXTRACTING" || doc.status === "ANALYZING";
  const isFailed = doc.status === "FAILED";
  const isCompleted = doc.status === "COMPLETED";

  return (
    <Link
      href={isCompleted ? `/documents/${doc.id}` : "#"}
      className={`card-brutal block ${isCompleted ? "hover:border-primary/30" : "cursor-default"}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <FileTypeIcon type={doc.fileType} className="w-8 h-8 shrink-0" />
          <div className="min-w-0">
            <h3 className="font-medium text-foreground truncate">{doc.fileName}</h3>
            <p className="text-xs text-muted-foreground">
              {(doc.fileSize / 1024).toFixed(0)} KB &middot;{" "}
              {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div>
          {isAnalyzing && (
            <div className="flex items-center gap-1 text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">{t("analyzing")}</span>
            </div>
          )}
          {isFailed && (
            <div className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">{t("failed")}</span>
            </div>
          )}
          {isCompleted && (
            <div className="flex items-center gap-1 text-green-500">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs">{t("completed")}</span>
            </div>
          )}
        </div>
      </div>

      {isCompleted && doc.analysis && (
        <>
          <div className="flex items-center gap-2 mb-3">
            {doc.analysis.contractTypeLabel && (
              <span className="tag-accent text-xs">
                {doc.analysis.contractTypeLabel}
              </span>
            )}
            {doc.analysis.jurisdiction && doc.analysis.jurisdiction !== "UNKNOWN" && (
              <span className="tag text-xs">
                {doc.analysis.jurisdiction.replace("_", " ")}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs">
              {doc.analysis._count && (
                <span className="text-muted-foreground">
                  {doc.analysis._count.clauses} {t("clauses")}
                </span>
              )}
              {criticalCount > 0 && (
                <span className="text-red-400">{criticalCount} critical</span>
              )}
              {warningCount > 0 && (
                <span className="text-yellow-400">{warningCount} warning</span>
              )}
              {infoCount > 0 && (
                <span className="text-blue-400">{infoCount} info</span>
              )}
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </>
      )}
    </Link>
  );
}
