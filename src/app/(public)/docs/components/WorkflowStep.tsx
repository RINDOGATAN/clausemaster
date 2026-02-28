interface WorkflowStepProps {
  number: number;
  title: string;
  description: string;
  actor?: string;
  details?: string[];
  isLast?: boolean;
}

export function WorkflowStep({
  number,
  title,
  description,
  actor,
  details,
  isLast = false,
}: WorkflowStepProps) {
  return (
    <div className="flex gap-4">
      {/* Left: number + connector */}
      <div className="flex flex-col items-center">
        <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
          {number}
        </div>
        {!isLast && <div className="w-px flex-1 min-h-[40px] bg-border" />}
      </div>

      {/* Right: content */}
      <div className="pb-8">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          {actor && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {actor}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
        {details && details.length > 0 && (
          <ul className="mt-2 space-y-1">
            {details.map((detail, i) => (
              <li
                key={i}
                className="text-xs text-muted-foreground flex items-start gap-2"
              >
                <span className="text-primary mt-0.5">&#8226;</span>
                {detail}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
