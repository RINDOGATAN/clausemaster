import { FileCheck } from "lucide-react";

interface ContractTypeBadgeProps {
  type: string;
  label: string;
}

export function ContractTypeBadge({ type, label }: ContractTypeBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
      <FileCheck className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
