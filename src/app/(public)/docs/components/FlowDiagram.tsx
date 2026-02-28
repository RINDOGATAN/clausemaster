"use client";

interface FlowStep {
  label: string;
  description?: string;
}

interface FlowDiagramProps {
  steps: FlowStep[];
  direction?: "horizontal" | "vertical";
}

export function FlowDiagram({
  steps,
  direction = "horizontal",
}: FlowDiagramProps) {
  if (direction === "vertical") {
    return (
      <div className="space-y-0">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-4">
            {/* Left: number + connector */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className="w-px h-12 bg-primary/30" />
              )}
            </div>
            {/* Right: label + description */}
            <div className="pb-8">
              <p className="text-sm font-semibold text-foreground">
                {step.label}
              </p>
              {step.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Horizontal
  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start">
          <div className="flex flex-col items-center min-w-[100px]">
            <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 text-primary flex items-center justify-center text-sm font-bold shrink-0">
              {i + 1}
            </div>
            <p className="text-xs font-semibold text-foreground mt-2 text-center leading-tight">
              {step.label}
            </p>
            {step.description && (
              <p className="text-[11px] text-muted-foreground mt-1 text-center leading-tight max-w-[100px]">
                {step.description}
              </p>
            )}
          </div>
          {i < steps.length - 1 && (
            <div className="flex items-center pt-3.5 px-1">
              <div className="w-8 h-px bg-primary/40" />
              <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-primary/40" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
