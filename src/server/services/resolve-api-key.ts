import prisma from "@/lib/prisma";
import { isPrivilegedDomain } from "./domain-check";
import { decryptApiKey } from "./crypto";

export async function resolveApiKeyForUser(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, encryptedApiKey: true, apiKeyIv: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Privileged domain users get the platform key
  if (isPrivilegedDomain(user.email)) {
    const platformKey = process.env.ANTHROPIC_API_KEY;
    if (!platformKey) {
      throw new Error("Platform API key not configured");
    }
    return platformKey;
  }

  // Other users must have their own key
  if (!user.encryptedApiKey || !user.apiKeyIv) {
    throw new Error("No API key configured. Please add your Anthropic API key in Settings.");
  }

  return decryptApiKey(user.encryptedApiKey, user.apiKeyIv);
}
