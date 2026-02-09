"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Circle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Progress } from "@/components/ui/progress";

const POLL_INTERVAL = 2000;

interface UploadProgressProps {
  documentId: string;
}

export function UploadProgress({ documentId }: UploadProgressProps) {
  const t = useTranslations("upload");
  const router = useRouter();

  const { data: document } = trpc.document.getById.useQuery(
    { id: documentId },
    {
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (status === "COMPLETED" || status === "FAILED") return false;
        return POLL_INTERVAL;
      },
    }
  );

  const status = document?.status;

  useEffect(() => {
    if (status === "COMPLETED") {
      const timer = setTimeout(() => {
        router.push(`/documents/${documentId}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, documentId, router]);

  const steps = [
    { key: "EXTRACTING", label: t("step1"), order: 1 },
    { key: "ANALYZING", label: t("step2"), order: 2 },
    { key: "ANALYZING_CLAUSES", label: t("step3"), order: 3 },
    { key: "ANALYZING_ISSUES", label: t("step4"), order: 4 },
  ];

  const getStepStatus = (stepOrder: number) => {
    const s = status as string;
    if (s === "COMPLETED") return "completed";
    if (s === "FAILED") return "failed";

    const currentOrder =
      s === "EXTRACTING" ? 1 :
      s === "ANALYZING" ? 2 :
      s === "COMPLETED" ? 5 : 0;

    if (stepOrder < currentOrder) return "completed";
    if (stepOrder === currentOrder) return "active";
    return "pending";
  };

  const s = status as string;
  const progressPercent =
    s === "UPLOADED" ? 5 :
    s === "EXTRACTING" ? 25 :
    s === "ANALYZING" ? 60 :
    s === "COMPLETED" ? 100 :
    s === "FAILED" ? 0 : 0;

  return (
    <div className="card-brutal max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold mb-2">
          {status === "COMPLETED" ? t("complete") : t("analyzing")}
        </h2>
        {status === "COMPLETED" && (
          <p className="text-sm text-muted-foreground">{t("redirecting")}</p>
        )}
        {status === "FAILED" && (
          <p className="text-sm text-destructive">{document?.errorMessage || t("uploadFailed")}</p>
        )}
      </div>

      <Progress value={progressPercent} className="mb-8" />

      <div className="space-y-4">
        {steps.map((step) => {
          const stepStatus = getStepStatus(step.order);
          return (
            <div key={step.key} className="flex items-center gap-3">
              {stepStatus === "completed" ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              ) : stepStatus === "active" ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground/30 shrink-0" />
              )}
              <span className={`text-sm ${
                stepStatus === "completed" ? "text-foreground" :
                stepStatus === "active" ? "text-primary font-medium" :
                "text-muted-foreground"
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
