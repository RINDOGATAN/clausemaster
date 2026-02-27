import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { isPrivilegedDomain } from "../services/domain-check";
import { encryptApiKey } from "../services/crypto";

export const settingsRouter = createTRPCRouter({
  getApiKeyStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { email: true, encryptedApiKey: true },
    });

    if (!user) {
      return { hasApiKey: false, isPrivileged: false, maskedKey: null };
    }

    const privileged = isPrivilegedDomain(user.email ?? "");

    return {
      hasApiKey: privileged || !!user.encryptedApiKey,
      isPrivileged: privileged,
      maskedKey: user.encryptedApiKey ? "sk-ant-...****" : null,
    };
  }),

  saveApiKey: protectedProcedure
    .input(z.object({ apiKey: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!input.apiKey.startsWith("sk-ant-")) {
        throw new Error("Invalid API key format. Anthropic keys start with sk-ant-");
      }

      const { encrypted, iv } = encryptApiKey(input.apiKey);

      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: {
          encryptedApiKey: encrypted,
          apiKeyIv: iv,
        },
      });

      return { success: true };
    }),

  deleteApiKey: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.user.update({
      where: { id: ctx.session.user.id },
      data: {
        encryptedApiKey: null,
        apiKeyIv: null,
      },
    });

    return { success: true };
  }),
});
