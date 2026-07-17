"use client";

import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

// Client-driven pipeline execution: Vercel Hobby caps serverless functions
// at 10s, so the server never runs the whole AI pipeline in one invocation.
// Instead these hooks call a "run one step" mutation in a loop until the
// server reports done; every step persists its result, so an interrupted
// pipeline (closed tab, crashed step) resumes from where it left off the
// next time a page with the driver mounts.

const MAX_CONSECUTIVE_ERRORS = 5;
const ERROR_BACKOFF_MS = 3000;

const ANALYSIS_ACTIVE_STATUSES = ["UPLOADED", "EXTRACTING", "ANALYZING"];

/** Drives document analysis while the document is in a non-terminal status. */
export function useAnalysisDriver(
  documentId: string | undefined,
  status: string | undefined,
  onStep?: () => void
) {
  const mutation = trpc.document.runAnalysisStep.useMutation();
  const active = !!documentId && !!status && ANALYSIS_ACTIVE_STATUSES.includes(status);
  useStepLoop(active, (opts) => mutation.mutate({ id: documentId! }, opts), onStep);
}

/** Drives skill draft generation while the draft is GENERATING. */
export function useSkillDraftDriver(
  analysisId: string | undefined,
  draftStatus: string | undefined,
  onStep?: () => void
) {
  const mutation = trpc.skillDraft.runStep.useMutation();
  const active = !!analysisId && draftStatus === "GENERATING";
  useStepLoop(active, (opts) => mutation.mutate({ analysisId: analysisId! }, opts), onStep);
}

function useStepLoop(
  active: boolean,
  runStep: (opts: { onSuccess: () => void; onError: () => void }) => void,
  onStep?: () => void
) {
  const [tick, setTick] = useState(0);
  const inFlight = useRef(false);
  const errorCount = useRef(0);
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;

  useEffect(() => {
    if (!active || inFlight.current) return;
    if (errorCount.current >= MAX_CONSECUTIVE_ERRORS) return;

    inFlight.current = true;
    let backoffTimer: ReturnType<typeof setTimeout> | undefined;

    runStep({
      onSuccess: () => {
        inFlight.current = false;
        errorCount.current = 0;
        onStepRef.current?.();
        // `active` recomputes from the refetched status; tick re-fires the
        // effect for step chains that don't change the status (e.g.
        // classify -> clauses -> issues are all ANALYZING)
        setTick((t) => t + 1);
      },
      onError: () => {
        // Transient transport failure (the server marks AI failures as
        // FAILED itself, which deactivates the loop via status) — retry
        // with a delay, give up after a few consecutive errors
        inFlight.current = false;
        errorCount.current += 1;
        onStepRef.current?.();
        if (errorCount.current < MAX_CONSECUTIVE_ERRORS) {
          backoffTimer = setTimeout(() => setTick((t) => t + 1), ERROR_BACKOFF_MS);
        }
      },
    });

    return () => {
      if (backoffTimer) clearTimeout(backoffTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, tick]);
}
