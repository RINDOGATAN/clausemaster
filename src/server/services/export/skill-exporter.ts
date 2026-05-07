import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { Octokit } from "@octokit/rest";
import prisma from "@/lib/prisma";

const GITHUB_OWNER = process.env.LEGALSKILLS_GITHUB_OWNER || "RINDOGATAN";
const GITHUB_REPO = process.env.LEGALSKILLS_GITHUB_REPO || "legalskills";
const GITHUB_BRANCH = process.env.LEGALSKILLS_GITHUB_BRANCH || "main";

export async function exportSkillDraft(
  skillDraftId: string,
  outputDir?: string
): Promise<string> {
  const draft = await prisma.skillDraft.findUnique({
    where: { id: skillDraftId },
    include: {
      analysis: {
        include: {
          document: {
            select: {
              userId: true,
              user: {
                select: {
                  email: true,
                  name: true,
                  publisherProfile: {
                    select: {
                      firmName: true,
                      stripeConnectAccountId: true,
                      stripeConnectComplete: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!draft) {
    throw new Error("Skill draft not found");
  }

  if (draft.status !== "REVIEW" && draft.status !== "APPROVED") {
    throw new Error(`Cannot export draft in status "${draft.status}". Must be in REVIEW or APPROVED status.`);
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

  // Enrich manifest with publisher info for downstream platforms (Dealroom, DPO Central, AI Sentinel)
  const publisher = draft.analysis?.document?.user;
  const profile = publisher?.publisherProfile;
  const manifestData = draft.manifestJson as Record<string, unknown> | null;

  if (manifestData && publisher) {
    manifestData.author = {
      name: profile?.firmName || publisher.name || "Unknown",
      email: publisher.email,
      ...(profile?.stripeConnectAccountId && profile.stripeConnectComplete
        ? { stripeConnectAccountId: profile.stripeConnectAccountId }
        : {}),
    };
  }

  // Derive directory name from contractType (lowercase, hyphenated)
  const dirName = (draft.contractType || "contract")
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

  // Build the file set we want to publish
  const files: Array<{ name: string; content: string }> = [];
  if (isAssessment) {
    files.push({ name: "assessment.json", content: JSON.stringify(draft.assessmentJson, null, 2) });
    if (draft.guidanceJson) {
      files.push({ name: "guidance.json", content: JSON.stringify(draft.guidanceJson, null, 2) });
    }
  } else {
    files.push({ name: "clauses.json", content: JSON.stringify(draft.clausesJson, null, 2) });
    files.push({ name: "boilerplate.json", content: JSON.stringify(draft.boilerplateJson, null, 2) });
  }
  files.push({ name: "metadata.json", content: JSON.stringify(draft.metadataJson, null, 2) });
  files.push({ name: "manifest.json", content: JSON.stringify(draft.manifestJson, null, 2) });

  const githubToken = process.env.LEGALSKILLS_GITHUB_TOKEN;
  let exportPath: string;

  if (githubToken) {
    exportPath = await commitToGitHub({
      token: githubToken,
      dirName,
      files,
      message: `Publish skill: ${draft.displayName || dirName}`,
      authorName: profile?.firmName || publisher?.name || "Clausemaster",
      authorEmail: publisher?.email || "noreply@todo.law",
    });
  } else {
    exportPath = await writeToFilesystem({
      baseDir: outputDir || process.env.LEGALSKILLS_DIR || "../legalskills",
      dirName,
      files,
    });
  }

  await prisma.skillDraft.update({
    where: { id: skillDraftId },
    data: {
      status: "EXPORTED",
      exportedAt: new Date(),
      exportPath,
    },
  });

  return exportPath;
}

async function writeToFilesystem(args: {
  baseDir: string;
  dirName: string;
  files: Array<{ name: string; content: string }>;
}): Promise<string> {
  const skillDir = join(args.baseDir, args.dirName);
  await mkdir(skillDir, { recursive: true });
  await Promise.all(
    args.files.map((f) => writeFile(join(skillDir, f.name), f.content, "utf-8"))
  );
  return skillDir;
}

async function commitToGitHub(args: {
  token: string;
  dirName: string;
  files: Array<{ name: string; content: string }>;
  message: string;
  authorName: string;
  authorEmail: string;
}): Promise<string> {
  const octokit = new Octokit({ auth: args.token });
  const owner = GITHUB_OWNER;
  const repo = GITHUB_REPO;
  const branch = GITHUB_BRANCH;

  // 1. Get latest commit SHA on branch
  const { data: ref } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const latestCommitSha = ref.object.sha;

  // 2. Get base tree from that commit
  const { data: latestCommit } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: latestCommitSha,
  });
  const baseTreeSha = latestCommit.tree.sha;

  // 3. Create blobs for each file
  const blobs = await Promise.all(
    args.files.map((f) =>
      octokit.rest.git.createBlob({
        owner,
        repo,
        content: f.content,
        encoding: "utf-8",
      })
    )
  );

  // 4. Create new tree with the new blobs layered on top of base
  const { data: newTree } = await octokit.rest.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: args.files.map((f, i) => ({
      path: `${args.dirName}/${f.name}`,
      mode: "100644",
      type: "blob",
      sha: blobs[i].data.sha,
    })),
  });

  // 5. Create new commit pointing to the new tree
  const { data: newCommit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: args.message,
    tree: newTree.sha,
    parents: [latestCommitSha],
    author: {
      name: args.authorName,
      email: args.authorEmail,
    },
  });

  // 6. Move the branch ref forward
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
  });

  return `https://github.com/${owner}/${repo}/tree/${branch}/${args.dirName}`;
}
