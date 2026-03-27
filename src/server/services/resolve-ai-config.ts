import prisma from "@/lib/prisma";
import { isPrivilegedDomain } from "./domain-check";
import { decryptApiKey } from "./crypto";
import { AI_PROVIDERS, type AIProviderKey } from "./ai/providers";

export interface AIConfig {
  provider: AIProviderKey;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export async function resolveAIConfigForUser(userId: string): Promise<AIConfig> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      aiProvider: true,
      aiModel: true,
      encryptedApiKey: true,
      apiKeyIv: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const provider = (user.aiProvider || "COMMUNITY") as AIProviderKey;

  // Privileged domain users always get the platform Anthropic key
  if (isPrivilegedDomain(user.email)) {
    const platformKey = process.env.ANTHROPIC_API_KEY;
    if (!platformKey) {
      throw new Error("Platform API key not configured");
    }
    return {
      provider: "ANTHROPIC",
      model: user.aiModel || AI_PROVIDERS.ANTHROPIC.defaultModel,
      apiKey: platformKey,
    };
  }

  // Community tier: use platform-provided open model
  if (provider === "COMMUNITY") {
    const apiKey = process.env.PLATFORM_AI_API_KEY;
    const baseUrl = process.env.PLATFORM_AI_BASE_URL;
    const model = process.env.PLATFORM_AI_MODEL || AI_PROVIDERS.COMMUNITY.defaultModel;

    if (!apiKey || !baseUrl) {
      throw new Error("Community AI model is not available. Please configure your own API key in Settings.");
    }

    return { provider: "COMMUNITY", model, apiKey, baseUrl };
  }

  // Pro tier: use user's stored key
  if (!user.encryptedApiKey || !user.apiKeyIv) {
    const providerDef = AI_PROVIDERS[provider];
    throw new Error(
      `No API key configured for ${providerDef.label}. Please add your key in Settings.`
    );
  }

  const decryptedKey = decryptApiKey(user.encryptedApiKey, user.apiKeyIv);
  const providerDef = AI_PROVIDERS[provider];

  return {
    provider,
    model: user.aiModel || providerDef.defaultModel,
    apiKey: decryptedKey,
    baseUrl: providerDef.baseUrl || undefined,
  };
}
