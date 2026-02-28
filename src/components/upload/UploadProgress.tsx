"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Circle, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Progress } from "@/components/ui/progress";

const POLL_INTERVAL = 2000;
const STALL_TIMEOUT = 60_000; // 60 seconds without status change = stalled

interface UploadProgressProps {
  documentId: string;
}

export function UploadProgress({ documentId }: UploadProgressProps) {
  const t = useTranslations("upload");
  const router = useRouter();
  const [stalled, setStalled] = useState(false);
  const lastStatusRef = useRef<string | undefined>(undefined);
  const lastChangeRef = useRef(Date.now());

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

  // Track stalled analysis
  useEffect(() => {
    if (status !== lastStatusRef.current) {
      lastStatusRef.current = status;
      lastChangeRef.current = Date.now();
      setStalled(false);
    }

    if (status === "COMPLETED" || status === "FAILED") return;

    const interval = setInterval(() => {
      if (Date.now() - lastChangeRef.current > STALL_TIMEOUT) {
        setStalled(true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status]);

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

      {stalled && status !== "COMPLETED" && status !== "FAILED" && (
        <div className="mt-6 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-500 font-medium">Taking longer than expected</p>
            <p className="text-xs text-muted-foreground mt-1">
              The analysis may have timed out. You can return to{" "}
              <button
                onClick={() => router.push("/documents")}
                className="text-primary hover:underline"
              >
                your documents
              </button>
              {" "}and check back later, or try uploading again.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
