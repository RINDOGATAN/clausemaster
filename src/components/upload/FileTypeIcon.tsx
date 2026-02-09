import { FileText, File, FileType } from "lucide-react";

interface FileTypeIconProps {
  type: string;
  className?: string;
}

export function FileTypeIcon({ type, className = "w-5 h-5" }: FileTypeIconProps) {
  switch (type) {
    case "PDF":
      return <FileText className={`${className} text-red-400`} />;
    case "DOCX":
      return <FileType className={`${className} text-blue-400`} />;
    case "TXT":
      return <File className={`${className} text-gray-400`} />;
    default:
      return <File className={`${className} text-muted-foreground`} />;
  }
}
