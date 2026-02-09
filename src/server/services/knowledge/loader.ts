import { readFile, readdir, access } from "fs/promises";
import { join } from "path";

const LEGALSKILLS_DIR = process.env.LEGALSKILLS_DIR || "../legalskills";

interface SkillMetadata {
  contractType: string;
  displayName: string;
  description: string;
  version: string;
  clauseCount?: number;
}

interface SkillClause {
  id: string;
  title: { en: string; es?: string };
  category: string;
  order: number;
  plainDescription?: { en: string; es?: string };
}

interface SkillContext {
  skillMd: string;
  metadata: SkillMetadata;
  clauseTitles: string[];
  clauses: SkillClause[];
}

// Map contract types to legalskills directory names
const CONTRACT_TYPE_MAP: Record<string, string> = {
  FOUNDERS: "founders-agreement",
  "FOUNDERS_AGREEMENT": "founders-agreement",
  SAFE: "safe-agreement",
  "SAFE_AGREEMENT": "safe-agreement",
  PACTO_SOCIOS: "pacto-socios",
};

export async function getAvailableSkills(): Promise<string[]> {
  try {
    const resolvedDir = resolveSkillsDir();
    const entries = await readdir(resolvedDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("."))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

export async function loadSkillContext(contractType: string): Promise<SkillContext | null> {
  const dirName = CONTRACT_TYPE_MAP[contractType.toUpperCase()] || contractType.toLowerCase().replace(/\s+/g, "-");
  const skillDir = join(resolveSkillsDir(), dirName);

  try {
    await access(skillDir);
  } catch {
    return null;
  }

  try {
    const [skillMd, clausesJson, metadataJson] = await Promise.all([
      readFileSafe(join(skillDir, "SKILL.md")),
      readFileSafe(join(skillDir, "clauses.json")),
      readFileSafe(join(skillDir, "metadata.json")),
    ]);

    const metadata: SkillMetadata = metadataJson
      ? JSON.parse(metadataJson)
      : { contractType, displayName: contractType, description: "", version: "1.0" };

    let clauses: SkillClause[] = [];
    if (clausesJson) {
      const parsed = JSON.parse(clausesJson);
      clauses = parsed.clauses || [];
    }

    const clauseTitles = clauses.map((c) =>
      typeof c.title === "string" ? c.title : c.title.en
    );

    return {
      skillMd: skillMd || "",
      metadata,
      clauseTitles,
      clauses,
    };
  } catch (error) {
    console.error(`Failed to load skill context for ${contractType}:`, error);
    return null;
  }
}

function resolveSkillsDir(): string {
  const dir = LEGALSKILLS_DIR;
  if (dir.startsWith("/")) return dir;
  return join(process.cwd(), dir);
}

async function readFileSafe(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}
