import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const skillDraftRouter = createTRPCRouter({
  generate: protectedProcedure
    .input(z.object({ analysisId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the analysis belongs to the user's document
      const analysis = await ctx.prisma.analysis.findUnique({
        where: { id: input.analysisId },
        include: { document: true },
      });

      if (!analysis || analysis.document.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      // Check if draft already exists
      const existing = await ctx.prisma.skillDraft.findUnique({
        where: { analysisId: input.analysisId },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A skill draft already exists for this analysis. Use regenerate to start over.",
        });
      }

      // Start generation in background
      const { generateSkillDraft } = await import("@/server/services/ai/skill-generator");
      generateSkillDraft(input.analysisId).catch(console.error);

      return { analysisId: input.analysisId };
    }),

  get: protectedProcedure
    .input(z.object({ analysisId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const analysis = await ctx.prisma.analysis.findUnique({
        where: { id: input.analysisId },
        include: { document: true },
      });

      if (!analysis || analysis.document.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      return ctx.prisma.skillDraft.findUnique({
        where: { analysisId: input.analysisId },
      });
    }),

  updateClauses: protectedProcedure
    .input(z.object({
      skillDraftId: z.string(),
      clausesJson: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const draft = await verifyDraftOwnership(ctx, input.skillDraftId);

      if (draft.status !== "REVIEW") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only edit drafts in REVIEW status" });
      }

      return ctx.prisma.skillDraft.update({
        where: { id: input.skillDraftId },
        data: { clausesJson: input.clausesJson },
      });
    }),

  updateBoilerplate: protectedProcedure
    .input(z.object({
      skillDraftId: z.string(),
      boilerplateJson: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const draft = await verifyDraftOwnership(ctx, input.skillDraftId);

      if (draft.status !== "REVIEW") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only edit drafts in REVIEW status" });
      }

      return ctx.prisma.skillDraft.update({
        where: { id: input.skillDraftId },
        data: { boilerplateJson: input.boilerplateJson },
      });
    }),

  updateMetadata: protectedProcedure
    .input(z.object({
      skillDraftId: z.string(),
      metadataJson: z.any().optional(),
      manifestJson: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const draft = await verifyDraftOwnership(ctx, input.skillDraftId);

      if (draft.status !== "REVIEW") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only edit drafts in REVIEW status" });
      }

      return ctx.prisma.skillDraft.update({
        where: { id: input.skillDraftId },
        data: {
          ...(input.metadataJson !== undefined && { metadataJson: input.metadataJson }),
          ...(input.manifestJson !== undefined && { manifestJson: input.manifestJson }),
        },
      });
    }),

  export: protectedProcedure
    .input(z.object({ skillDraftId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyDraftOwnership(ctx, input.skillDraftId);

      const { exportSkillDraft } = await import("@/server/services/export/skill-exporter");
      const exportPath = await exportSkillDraft(input.skillDraftId);

      return { exportPath };
    }),

  regenerate: protectedProcedure
    .input(z.object({ analysisId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const analysis = await ctx.prisma.analysis.findUnique({
        where: { id: input.analysisId },
        include: { document: true },
      });

      if (!analysis || analysis.document.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      // Delete existing draft
      await ctx.prisma.skillDraft.deleteMany({
        where: { analysisId: input.analysisId },
      });

      // Start generation in background
      const { generateSkillDraft } = await import("@/server/services/ai/skill-generator");
      generateSkillDraft(input.analysisId).catch(console.error);

      return { analysisId: input.analysisId };
    }),
});

// Helper to verify the user owns the draft's document
async function verifyDraftOwnership(
  ctx: { prisma: typeof import("@/lib/prisma").default; session: { user: { id: string } } },
  skillDraftId: string
) {
  const draft = await ctx.prisma.skillDraft.findUnique({
    where: { id: skillDraftId },
    include: {
      analysis: {
        include: { document: true },
      },
    },
  });

  if (!draft || draft.analysis.document.userId !== ctx.session.user.id) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Skill draft not found" });
  }

  return draft;
}
