import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { isPrivilegedDomain } from "../services/domain-check";
import { encryptApiKey } from "../services/crypto";
import { AI_PROVIDERS, getProviderOptions, type AIProviderKey } from "../services/ai/providers";

const aiProviderEnum = z.enum([
  "COMMUNITY", "ANTHROPIC", "OPENAI", "GROQ", "MISTRAL", "TOGETHER",
]);

export const settingsRouter = createTRPCRouter({
  getAIProviderStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { email: true, aiProvider: true, aiModel: true, encryptedApiKey: true },
    });

    if (!user) {
      return {
        provider: "COMMUNITY" as AIProviderKey,
        providerLabel: AI_PROVIDERS.COMMUNITY.label,
        model: AI_PROVIDERS.COMMUNITY.defaultModel,
        hasApiKey: false,
        isPrivileged: false,
        maskedKey: null,
        communityAvailable: !!process.env.PLATFORM_AI_API_KEY,
      };
    }

    const provider = (user.aiProvider || "COMMUNITY") as AIProviderKey;
    const providerDef = AI_PROVIDERS[provider];
    const privileged = isPrivilegedDomain(user.email ?? "");

    return {
      provider,
      providerLabel: providerDef.label,
      model: user.aiModel || providerDef.defaultModel,
      hasApiKey: privileged || provider === "COMMUNITY" || !!user.encryptedApiKey,
      isPrivileged: privileged,
      maskedKey: user.encryptedApiKey
        ? `${providerDef.keyPrefix || ""}...****`
        : null,
      communityAvailable: !!process.env.PLATFORM_AI_API_KEY,
    };
  }),

  getProviderOptions: protectedProcedure.query(() => {
    return {
      providers: getProviderOptions(),
      communityAvailable: !!process.env.PLATFORM_AI_API_KEY,
    };
  }),

  saveAIProvider: protectedProcedure
    .input(z.object({
      provider: aiProviderEnum,
      apiKey: z.string().optional(),
      model: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = {
        aiProvider: input.provider,
        aiModel: input.model || null,
      };

      if (input.provider === "COMMUNITY") {
        // Clear stored key when switching to community
        data.encryptedApiKey = null;
        data.apiKeyIv = null;
      } else if (input.apiKey) {
        // Validate key prefix for providers that have one
        const providerDef = AI_PROVIDERS[input.provider as AIProviderKey];
        if (providerDef.keyPrefix && !input.apiKey.startsWith(providerDef.keyPrefix)) {
          throw new Error(
            `Invalid API key format for ${providerDef.label}. Keys should start with "${providerDef.keyPrefix}"`
          );
        }
        const { encrypted, iv } = encryptApiKey(input.apiKey);
        data.encryptedApiKey = encrypted;
        data.apiKeyIv = iv;
      }

      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data,
      });

      return { success: true };
    }),

  resetAIProvider: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.user.update({
      where: { id: ctx.session.user.id },
      data: {
        aiProvider: "COMMUNITY",
        aiModel: null,
        encryptedApiKey: null,
        apiKeyIv: null,
      },
    });

    return { success: true };
  }),

  // Backward compatibility aliases
  getApiKeyStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { email: true, aiProvider: true, encryptedApiKey: true },
    });

    if (!user) {
      return { hasApiKey: false, isPrivileged: false, maskedKey: null };
    }

    const privileged = isPrivilegedDomain(user.email ?? "");
    const provider = (user.aiProvider || "COMMUNITY") as AIProviderKey;

    return {
      hasApiKey: privileged || provider === "COMMUNITY" || !!user.encryptedApiKey,
      isPrivileged: privileged,
      maskedKey: user.encryptedApiKey ? "...****" : null,
    };
  }),
});
