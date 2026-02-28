"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { DocumentGrid } from "@/components/documents/DocumentGrid";
import { EmptyState } from "@/components/documents/EmptyState";

export default function DocumentsPage() {
  const t = useTranslations("documents");
  const { data: documents, isLoading } = trpc.document.list.useQuery(undefined, {
    refetchInterval: (query) => {
      const docs = query.state.data;
      if (!docs) return false;
      const hasInProgress = docs.some(
        (d: { status: string }) =>
          d.status !== "COMPLETED" && d.status !== "FAILED"
      );
      return hasInProgress ? 5000 : false;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("myDocuments")}</h1>
          <p className="text-muted-foreground mt-1">{t("manageDocuments")}</p>
        </div>
        <Link href="/documents/new" className="btn-brutal inline-flex items-center gap-2">
          <Plus className="w-5 h-5" />
          {t("uploadNew")}
        </Link>
      </div>

      {documents && documents.length > 0 ? (
        <DocumentGrid documents={documents as Parameters<typeof DocumentGrid>[0]["documents"]} />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
