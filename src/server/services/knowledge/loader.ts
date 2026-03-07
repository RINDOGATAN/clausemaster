import { readFile, readdir, access } from "fs/promises";
import { join } from "path";

const LEGALSKILLS_DIR = process.env.LEGALSKILLS_DIR || "../legalskills";

type I18nString = string | Record<string, string>;

interface SkillMetadata {
  contractType: string;
  displayName: I18nString;
  description: I18nString;
  category?: I18nString;
  version: string;
  clauseCount?: number;
  languages?: string[];
  jurisdictions?: string[];
  soloModeSupported?: boolean;
}

interface SkillClause {
  id: string;
  title: { en: string; es?: string };
  category: I18nString;
  order: number;
  plainDescription?: { en: string; es?: string };
}

interface SkillContext {
  skillMd: string;
  metadata: SkillMetadata;
  clauseTitles: string[];
  clauses: SkillClause[];
}

/** Resolve a possibly-localized string to a plain string (prefers English). */
function resolveStr(val: I18nString | undefined, fallback = ""): string {
  if (!val) return fallback;
  if (typeof val === "string") return val;
  return val.en || val.es || Object.values(val)[0] || fallback;
}

// Map contract types to legalskills directory names
const CONTRACT_TYPE_MAP: Record<string, string> = {
  FOUNDERS: "founders-agreement",
  FOUNDERS_AGREEMENT: "founders-agreement",
  SAFE: "safe-agreement",
  SAFE_AGREEMENT: "safe-agreement",
  PACTO_SOCIOS: "pacto-socios",
  SHAREHOLDERS: "shareholders-agreement",
  SHAREHOLDERS_AGREEMENT: "shareholders-agreement",
  CONSULTING: "consulting-agreement",
  CONSULTING_AGREEMENT: "consulting-agreement",
  EMPLOYMENT: "employment-agreement",
  EMPLOYMENT_AGREEMENT: "employment-agreement",
  IP_ASSIGNMENT: "ip-assignment",
  CONVERTIBLE_NOTE: "convertible-note",
  TERM_SHEET: "term-sheet",
  SEED_INVESTMENT: "seed-investment",
  DATA_LICENSING: "data-licensing",
  PHANTOM_SHARES: "phantom-shares-plan",
  PHANTOM_SHARES_PLAN: "phantom-shares-plan",
  PHANTOM_SHARES_GRANT: "phantom-shares-grant",
  ADVERTISING_IO: "advertising-io",
  AFFILIATE_PROGRAM: "affiliate-program",
  INFLUENCER_MARKETING: "influencer-marketing",
  WHITE_LABEL: "white-label-reseller",
  WHITE_LABEL_RESELLER: "white-label-reseller",
  ACTA_CONSEJO: "acta-consejo",
  ACTA_JUNTA: "acta-junta",
  CESION_PI: "cesion-pi",
  CONTRATO_LABORAL: "contrato-laboral",
  CONTRATO_SERVICIOS: "contrato-servicios",
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

export { resolveStr };

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
