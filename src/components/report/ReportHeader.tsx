import { useTranslations } from "next-intl";

interface ReportHeaderProps {
  documentName: string;
  generatedDate: string;
}

export function ReportHeader({ documentName, generatedDate }: ReportHeaderProps) {
  const t = useTranslations("report");

  return (
    <div className="border-b-2 border-amber-500 pb-6 mb-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-amber-600 tracking-widest uppercase mb-1">
            Clausemaster
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{documentName}</h1>
        </div>
        <div className="text-right text-sm text-gray-500">
          <div>{t("generatedBy")} Clausemaster</div>
          <div>{t("generatedOn")} {generatedDate}</div>
          <div className="text-xs text-gray-400 mt-1">todo.law</div>
        </div>
      </div>
    </div>
  );
}
