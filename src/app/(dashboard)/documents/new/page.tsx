"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DocumentUploader } from "@/components/upload/DocumentUploader";

export default function UploadPage() {
  const t = useTranslations("upload");

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <Link
          href="/documents"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to documents
        </Link>
        <h1 className="text-3xl font-bold">{t("uploadContract")}</h1>
      </div>

      <DocumentUploader />
    </div>
  );
}
