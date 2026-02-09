import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const analysisRouter = createTRPCRouter({
  getByDocumentId: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify document belongs to user
      const document = await ctx.prisma.document.findFirst({
        where: {
          id: input.documentId,
          userId: ctx.session.user.id,
        },
      });

      if (!document) {
        throw new Error("Document not found");
      }

      return ctx.prisma.analysis.findUnique({
        where: { documentId: input.documentId },
        include: {
          clauses: {
            include: { issues: true },
            orderBy: { order: "asc" },
          },
          issues: {
            orderBy: { severity: "asc" },
          },
        },
      });
    }),

  getClauses: protectedProcedure
    .input(z.object({ analysisId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.analyzedClause.findMany({
        where: { analysisId: input.analysisId },
        include: { issues: true },
        orderBy: { order: "asc" },
      });
    }),

  getIssues: protectedProcedure
    .input(z.object({
      analysisId: z.string(),
      severity: z.enum(["INFO", "WARNING", "CRITICAL"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.issue.findMany({
        where: {
          analysisId: input.analysisId,
          ...(input.severity ? { severity: input.severity } : {}),
        },
        include: { clause: true },
        orderBy: { severity: "asc" },
      });
    }),
});
