import { NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { analyzeDocument } from "@/server/services/ai/analyzer";
import { resolveAIConfigForUser } from "@/server/services/resolve-ai-config";

export const maxDuration = 120;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
const TYPE_MAP: Record<string, "PDF" | "DOCX" | "TXT"> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "text/plain": "TXT",
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve the user's AI provider config before proceeding
    let aiConfig: Awaited<ReturnType<typeof resolveAIConfigForUser>>;
    try {
      aiConfig = await resolveAIConfigForUser(session.user.id);
    } catch {
      return NextResponse.json(
        { error: "No AI provider configured. Please set up your AI provider in Settings." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Please upload a PDF, DOCX, or TXT file." }, { status: 400 });
    }

    const fileType = TYPE_MAP[file.type];
    if (!fileType) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Create document record with file data stored in DB
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        fileData: buffer,
        status: "UPLOADED",
      },
    });

    // Run analysis after response is sent (keeps function alive on Vercel)
    after(async () => {
      try {
        await analyzeDocument(document.id, aiConfig);
      } catch (error) {
        console.error("Background analysis failed:", error);
      }
    });

    return NextResponse.json({
      id: document.id,
      status: document.status,
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
