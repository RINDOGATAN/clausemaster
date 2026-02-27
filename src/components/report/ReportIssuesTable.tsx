import { useTranslations } from "next-intl";

interface ReportIssue {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  recommendation?: string | null;
  relatedClauseTitle?: string | null;
}

interface ReportIssuesTableProps {
  issues: ReportIssue[];
}

const SEVERITY_ORDER = { CRITICAL: 0, WARNING: 1, INFO: 2 } as const;

export function ReportIssuesTable({ issues }: ReportIssuesTableProps) {
  const t = useTranslations("report");

  const sorted = [...issues].sort((a, b) => {
    return (SEVERITY_ORDER[a.severity as keyof typeof SEVERITY_ORDER] ?? 3) -
      (SEVERITY_ORDER[b.severity as keyof typeof SEVERITY_ORDER] ?? 3);
  });

  const severityStyle = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-200";
      case "WARNING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "INFO":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (issues.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No issues found in this contract.
      </div>
    );
  }

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b-2 border-gray-300">
          <th className="text-left py-2 pr-3 font-semibold text-gray-700">{t("severity")}</th>
          <th className="text-left py-2 pr-3 font-semibold text-gray-700">{t("type")}</th>
          <th className="text-left py-2 pr-3 font-semibold text-gray-700">{t("description")}</th>
          <th className="text-left py-2 pr-3 font-semibold text-gray-700">{t("recommendation")}</th>
          <th className="text-left py-2 font-semibold text-gray-700">{t("relatedClause")}</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((issue) => (
          <tr key={issue.id} className="border-b border-gray-200">
            <td className="py-2 pr-3">
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${severityStyle(issue.severity)}`}>
                {issue.severity}
              </span>
            </td>
            <td className="py-2 pr-3 text-gray-700">{issue.type.replace(/_/g, " ")}</td>
            <td className="py-2 pr-3">
              <div className="font-medium text-gray-900">{issue.title}</div>
              <div className="text-gray-600 mt-0.5">{issue.description}</div>
            </td>
            <td className="py-2 pr-3 text-gray-600">{issue.recommendation || "—"}</td>
            <td className="py-2 text-gray-600">{issue.relatedClauseTitle || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
