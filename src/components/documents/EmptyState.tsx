"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FileSearch, Plus } from "lucide-react";

export function EmptyState() {
  const t = useTranslations("documents");

  return (
    <div className="card-brutal text-center py-16">
      <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <FileSearch className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold mb-2">{t("noDocumentsYet")}</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        {t("uploadFirst")}
      </p>
      <Link href="/documents/new" className="btn-brutal inline-flex items-center gap-2">
        <Plus className="w-5 h-5" />
        {t("uploadDocument")}
      </Link>
    </div>
  );
}
