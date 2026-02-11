export async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  switch (fileType) {
    case "PDF":
      return extractPdfText(buffer);
    case "DOCX":
      return extractDocxText(buffer);
    case "TXT":
      return buffer.toString("utf-8");
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
