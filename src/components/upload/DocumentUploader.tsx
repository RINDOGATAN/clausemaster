"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Upload, FileText, FileType, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { UploadProgress } from "./UploadProgress";

export function DocumentUploader() {
  const t = useTranslations("upload");
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("fileTooLarge"));
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 403) {
          toast.error(data.error || "API key required");
          router.push("/setup");
          return;
        }
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();
      setDocumentId(data.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("uploadFailed"));
      setIsUploading(false);
    }
  }, [t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  if (documentId) {
    return <UploadProgress documentId={documentId} />;
  }

  return (
    <div
      {...getRootProps()}
      className={`
        relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer
        transition-all duration-200
        ${isDragActive
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border hover:border-primary/50 hover:bg-card/50"
        }
        ${isUploading ? "pointer-events-none opacity-50" : ""}
      `}
    >
      <input {...getInputProps()} />

      {isUploading ? (
        <div className="space-y-4">
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
          <p className="text-lg font-medium">{t("uploading")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">
              {isDragActive ? t("dragAndDrop") : t("dragAndDrop")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("orClickToSelect")}
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span className="text-xs">PDF</span>
            </div>
            <div className="flex items-center gap-1">
              <FileType className="w-4 h-4" />
              <span className="text-xs">DOCX</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span className="text-xs">TXT</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("acceptedFormats")}
          </p>
        </div>
      )}
    </div>
  );
}
