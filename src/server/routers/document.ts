import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { resolveApiKeyForUser } from "../services/resolve-api-key";

export const documentRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.document.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        analysis: {
          include: {
            _count: {
              select: {
                clauses: true,
                issues: true,
              },
            },
            issues: {
              select: {
                severity: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const document = await ctx.prisma.document.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          analysis: {
            include: {
              clauses: {
                include: {
                  issues: true,
                },
                orderBy: { order: "asc" },
              },
              issues: {
                orderBy: { severity: "asc" },
              },
            },
          },
        },
      });

      if (!document) {
        throw new Error("Document not found");
      }

      return document;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.document.deleteMany({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });
      return { success: true };
    }),

  reanalyze: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.prisma.document.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!document) {
        throw new Error("Document not found");
      }

      // Delete existing analysis
      await ctx.prisma.analysis.deleteMany({
        where: { documentId: document.id },
      });

      // Reset status to trigger re-analysis
      await ctx.prisma.document.update({
        where: { id: document.id },
        data: {
          status: "UPLOADED",
          errorMessage: null,
        },
      });

      // Resolve the user's API key
      const anthropicApiKey = await resolveApiKeyForUser(ctx.session.user.id);

      // Trigger analysis in background
      const { analyzeDocument } = await import("@/server/services/ai/analyzer");
      analyzeDocument(document.id, { anthropicApiKey }).catch(console.error);

      return { success: true };
    }),
});
