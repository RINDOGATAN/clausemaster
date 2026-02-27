import { useTranslations } from "next-intl";

interface ReportClause {
  id: string;
  order: number;
  title: string;
  category?: string | null;
  originalText: string;
  summary?: string | null;
  legalSignificance?: string | null;
  biasAssessment: string;
}

interface ReportClauseSectionProps {
  clauses: ReportClause[];
}

export function ReportClauseSection({ clauses }: ReportClauseSectionProps) {
  const t = useTranslations("analysis");

  const biasLabel = (assessment: string) => {
    switch (assessment) {
      case "NEUTRAL":
        return t("neutral");
      case "FAVORS_PARTY_A":
        return t("favorsPartyA");
      case "FAVORS_PARTY_B":
        return t("favorsPartyB");
      default:
        return t("neutral");
    }
  };

  return (
    <div className="space-y-4">
      {clauses.map((clause) => (
        <div key={clause.id} className="print-clause border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs text-gray-400 font-mono">#{clause.order}</span>
            <h4 className="font-semibold text-gray-900">{clause.title}</h4>
            {clause.category && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {clause.category}
              </span>
            )}
            <span className="text-xs text-gray-500 ml-auto">
              {biasLabel(clause.biasAssessment)}
            </span>
          </div>

          {clause.summary && (
            <p className="text-sm text-gray-700 mb-2">{clause.summary}</p>
          )}

          {clause.legalSignificance && (
            <div className="text-xs text-gray-500 mb-2">
              <span className="font-medium">{t("legalSignificance")}:</span> {clause.legalSignificance}
            </div>
          )}

          <div className="bg-gray-50 border border-gray-100 rounded p-3 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap max-h-40 overflow-hidden">
            {clause.originalText}
          </div>
        </div>
      ))}
    </div>
  );
}
