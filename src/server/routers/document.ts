import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { resolveAIConfigForUser } from "../services/resolve-ai-config";

export const documentRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.document.findMany({
      where: { userId: ctx.session.user.id },
      // Explicit select: fileData (Bytes) must never reach the client — the
      // payload is huge and superjson can't revive Buffer in the browser,
      // which kills the whole query
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
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
        // Explicit select: fileData (Bytes) must never reach the client (see list)
        select: {
          id: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          status: true,
          errorMessage: true,
          createdAt: true,
          updatedAt: true,
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

      // Reset status; the client drives the pipeline via runAnalysisStep
      await ctx.prisma.document.update({
        where: { id: document.id },
        data: {
          status: "UPLOADED",
          errorMessage: null,
        },
      });

      return { success: true };
    }),

  // Runs one step of the analysis pipeline (client-driven so each AI call
  // gets its own serverless invocation — Vercel Hobby caps functions at 10s)
  runAnalysisStep: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.prisma.document.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        select: { id: true },
      });

      if (!document) {
        throw new Error("Document not found");
      }

      const aiConfig = await resolveAIConfigForUser(ctx.session.user.id);
      const { runAnalysisStep } = await import("@/server/services/ai/analyzer");
      return runAnalysisStep(document.id, aiConfig);
    }),
});
