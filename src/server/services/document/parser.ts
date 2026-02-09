import { readFile } from "fs/promises";

export async function extractText(filePath: string, fileType: string): Promise<string> {
  switch (fileType) {
    case "PDF":
      return extractPdfText(filePath);
    case "DOCX":
      return extractDocxText(filePath);
    case "TXT":
      return extractTxtText(filePath);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

async function extractPdfText(filePath: string): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const buffer = await readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractDocxText(filePath: string): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = await readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractTxtText(filePath: string): Promise<string> {
  const buffer = await readFile(filePath, "utf-8");
  return buffer;
}
