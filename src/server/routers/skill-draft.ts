import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, internalProcedure, publisherProcedure } from "../trpc";
import { resolveAIConfigForUser } from "../services/resolve-ai-config";

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

      // Create the draft row; the client drives generation via runStep
      await createDraftForAnalysis(ctx.prisma, input.analysisId, analysis.documentCategory);

      return { analysisId: input.analysisId };
    }),

  // Runs one step of skill generation (client-driven so each AI call gets
  // its own serverless invocation — Vercel Hobby caps functions at 10s)
  runStep: protectedProcedure
    .input(z.object({ analysisId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const analysis = await ctx.prisma.analysis.findUnique({
        where: { id: input.analysisId },
        include: { document: true },
      });

      if (!analysis || analysis.document.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      const draft = await ctx.prisma.skillDraft.findUnique({
        where: { analysisId: input.analysisId },
        select: { id: true, skillType: true },
      });

      if (!draft) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Skill draft not found" });
      }

      const aiConfig = await resolveAIConfigForUser(ctx.session.user.id);

      if (draft.skillType === "ASSESSMENT") {
        const { runAssessmentDraftStep } = await import("@/server/services/ai/assessment-generator");
        return runAssessmentDraftStep(draft.id, aiConfig);
      }
      const { runContractDraftStep } = await import("@/server/services/ai/skill-generator");
      return runContractDraftStep(draft.id, aiConfig);
    }),

  listMine: publisherProcedure.query(async ({ ctx }) => {
    return ctx.prisma.skillDraft.findMany({
      where: {
        analysis: {
          document: { userId: ctx.session.user.id },
        },
      },
      include: {
        analysis: {
          select: {
            contractType: true,
            document: { select: { id: true, fileName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
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

  updateAssessment: protectedProcedure
    .input(z.object({
      skillDraftId: z.string(),
      assessmentJson: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const draft = await verifyDraftOwnership(ctx, input.skillDraftId);

      if (draft.status !== "REVIEW") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only edit drafts in REVIEW status" });
      }

      return ctx.prisma.skillDraft.update({
        where: { id: input.skillDraftId },
        data: { assessmentJson: input.assessmentJson },
      });
    }),

  updateGuidance: protectedProcedure
    .input(z.object({
      skillDraftId: z.string(),
      guidanceJson: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const draft = await verifyDraftOwnership(ctx, input.skillDraftId);

      if (draft.status !== "REVIEW") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only edit drafts in REVIEW status" });
      }

      return ctx.prisma.skillDraft.update({
        where: { id: input.skillDraftId },
        data: { guidanceJson: input.guidanceJson },
      });
    }),

  updateDestination: protectedProcedure
    .input(z.object({
      skillDraftId: z.string(),
      destination: z.enum(["DEAL_ROOM", "DPO_CENTRAL", "AI_SENTINEL"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const draft = await verifyDraftOwnership(ctx, input.skillDraftId);

      if (draft.status !== "REVIEW" && draft.status !== "REJECTED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only change destination in REVIEW or REJECTED status" });
      }

      return ctx.prisma.skillDraft.update({
        where: { id: input.skillDraftId },
        data: { destination: input.destination },
      });
    }),

  export: internalProcedure
    .input(z.object({ skillDraftId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyDraftOwnership(ctx, input.skillDraftId);

      const { exportSkillDraft } = await import("@/server/services/export/skill-exporter");
      const exportPath = await exportSkillDraft(input.skillDraftId);

      return { exportPath };
    }),

  submit: publisherProcedure
    .input(z.object({ skillDraftId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const draft = await verifyDraftOwnership(ctx, input.skillDraftId);

      if (draft.status !== "REVIEW" && draft.status !== "REJECTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only submit drafts in REVIEW or REJECTED status",
        });
      }

      const updated = await ctx.prisma.skillDraft.update({
        where: { id: input.skillDraftId },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          reviewNotes: null,
          reviewedByUser: null,
        },
      });

      // Notify admins
      try {
        const { notifyAdminNewSubmission } = await import("../services/notifications");
        await notifyAdminNewSubmission(input.skillDraftId);
      } catch (e) {
        console.error("Failed to send submission notification:", e);
      }

      return updated;
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

      // Create a fresh draft row; the client drives generation via runStep
      await createDraftForAnalysis(ctx.prisma, input.analysisId, analysis.documentCategory);

      return { analysisId: input.analysisId };
    }),
});

// Creates the GENERATING draft row that runStep operates on
async function createDraftForAnalysis(
  prisma: typeof import("@/lib/prisma").default,
  analysisId: string,
  documentCategory: string | null
) {
  return prisma.skillDraft.create({
    data: {
      analysisId,
      status: "GENERATING",
      skillType: documentCategory === "assessment" ? "ASSESSMENT" : "CONTRACT",
    },
  });
}

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
