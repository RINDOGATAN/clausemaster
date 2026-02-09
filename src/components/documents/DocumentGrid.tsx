"use client";

import { DocumentCard } from "./DocumentCard";

interface DocumentGridProps {
  documents: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    status: string;
    createdAt: string | Date;
    analysis?: {
      contractType?: string | null;
      contractTypeLabel?: string | null;
      jurisdiction?: string;
      _count?: { clauses: number; issues: number };
      issues?: { severity: string }[];
    } | null;
  }>;
}

export function DocumentGrid({ documents }: DocumentGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
    </div>
  );
}
