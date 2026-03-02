import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import prisma from "@/lib/prisma";

export async function exportSkillDraft(
  skillDraftId: string,
  outputDir?: string
): Promise<string> {
  const draft = await prisma.skillDraft.findUnique({
    where: { id: skillDraftId },
  });

  if (!draft) {
    throw new Error("Skill draft not found");
  }

  if (draft.status !== "REVIEW") {
    throw new Error(`Cannot export draft in status "${draft.status}". Must be in REVIEW status.`);
  }

  const isAssessment = draft.skillType === "ASSESSMENT";

  if (isAssessment) {
    if (!draft.assessmentJson || !draft.metadataJson || !draft.manifestJson) {
      throw new Error("Assessment skill draft is missing required data");
    }
  } else {
    if (!draft.clausesJson || !draft.boilerplateJson || !draft.metadataJson || !draft.manifestJson) {
      throw new Error("Skill draft is missing required data");
    }
  }

  const baseDir = outputDir || process.env.LEGALSKILLS_DIR || "../legalskills";

  // Derive directory name from contractType (lowercase, hyphenated)
  const dirName = (draft.contractType || "contract")
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

  const skillDir = join(baseDir, dirName);

  // Create directory
  await mkdir(skillDir, { recursive: true });

  if (isAssessment) {
    // Write assessment files
    const files: Promise<void>[] = [
      writeFile(
        join(skillDir, "assessment.json"),
        JSON.stringify(draft.assessmentJson, null, 2),
        "utf-8"
      ),
      writeFile(
        join(skillDir, "metadata.json"),
        JSON.stringify(draft.metadataJson, null, 2),
        "utf-8"
      ),
      writeFile(
        join(skillDir, "manifest.json"),
        JSON.stringify(draft.manifestJson, null, 2),
        "utf-8"
      ),
    ];
    if (draft.guidanceJson) {
      files.push(
        writeFile(
          join(skillDir, "guidance.json"),
          JSON.stringify(draft.guidanceJson, null, 2),
          "utf-8"
        )
      );
    }
    await Promise.all(files);
  } else {
    // Write contract files
    await Promise.all([
      writeFile(
        join(skillDir, "clauses.json"),
        JSON.stringify(draft.clausesJson, null, 2),
        "utf-8"
      ),
      writeFile(
        join(skillDir, "metadata.json"),
        JSON.stringify(draft.metadataJson, null, 2),
        "utf-8"
      ),
      writeFile(
        join(skillDir, "manifest.json"),
        JSON.stringify(draft.manifestJson, null, 2),
        "utf-8"
      ),
      writeFile(
        join(skillDir, "boilerplate.json"),
        JSON.stringify(draft.boilerplateJson, null, 2),
        "utf-8"
      ),
    ]);
  }

  // Update draft status
  await prisma.skillDraft.update({
    where: { id: skillDraftId },
    data: {
      status: "EXPORTED",
      exportedAt: new Date(),
      exportPath: skillDir,
    },
  });

  return skillDir;
}
