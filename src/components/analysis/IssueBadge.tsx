import { AlertTriangle, AlertCircle, Info } from "lucide-react";

interface IssueBadgeProps {
  severity: string;
  count: number;
}

export function IssueBadge({ severity, count }: IssueBadgeProps) {
  const config = {
    CRITICAL: {
      icon: AlertTriangle,
      bg: "bg-red-500/10",
      text: "text-red-400",
      border: "border-red-500/20",
      label: "Critical",
    },
    WARNING: {
      icon: AlertCircle,
      bg: "bg-yellow-500/10",
      text: "text-yellow-400",
      border: "border-yellow-500/20",
      label: "Warning",
    },
    INFO: {
      icon: Info,
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/20",
      label: "Info",
    },
  }[severity] || {
    icon: Info,
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    label: severity,
  };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      <Icon className="w-3.5 h-3.5" />
      {count} {config.label}
    </span>
  );
}
