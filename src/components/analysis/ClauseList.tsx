"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Clause {
  id: string;
  order: number;
  title: string;
  category?: string | null;
  biasAssessment: string;
  issues: { severity: string }[];
}

interface ClauseListProps {
  clauses: Clause[];
  selectedClauseId: string | null;
  onSelectClause: (id: string) => void;
}

export function ClauseList({ clauses, selectedClauseId, onSelectClause }: ClauseListProps) {
  const t = useTranslations("analysis");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredClauses = clauses.filter((clause) =>
    clause.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (clause.category?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getIssueIndicator = (clause: Clause) => {
    const hasCritical = clause.issues.some((i) => i.severity === "CRITICAL");
    const hasWarning = clause.issues.some((i) => i.severity === "WARNING");
    const hasInfo = clause.issues.some((i) => i.severity === "INFO");

    if (hasCritical) return <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
    if (hasWarning) return <AlertCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
    if (hasInfo) return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("searchClauses")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredClauses.map((clause) => (
          <button
            key={clause.id}
            onClick={() => onSelectClause(clause.id)}
            className={`
              w-full text-left px-3 py-3 border-b border-border/50
              transition-colors text-sm
              ${selectedClauseId === clause.id
                ? "bg-primary/10 border-l-2 border-l-primary"
                : "hover:bg-secondary/50"
              }
            `}
          >
            <div className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground font-mono shrink-0 mt-0.5">
                {clause.order}.
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium truncate">{clause.title}</span>
                  {getIssueIndicator(clause)}
                </div>
                {clause.category && (
                  <span className="text-xs text-muted-foreground">{clause.category}</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-border text-xs text-muted-foreground">
        {t("clauseCount", { count: filteredClauses.length })}
      </div>
    </div>
  );
}
