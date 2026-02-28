import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, internalProcedure } from "../trpc";

export const adminRouter = createTRPCRouter({
  // ── Submissions ──

  listSubmissions: internalProcedure
    .input(
      z.object({
        status: z.enum(["SUBMITTED", "APPROVED", "REJECTED", "ALL"]).default("ALL"),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.skillDraft.findMany({
        where: input.status === "ALL"
          ? { status: { in: ["SUBMITTED", "APPROVED", "REJECTED"] } }
          : { status: input.status },
        include: {
          analysis: {
            include: {
              document: {
                select: {
                  id: true,
                  fileName: true,
                  userId: true,
                  user: { select: { id: true, email: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      });
    }),

  getSubmission: internalProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const draft = await ctx.prisma.skillDraft.findUnique({
        where: { id: input.id },
        include: {
          analysis: {
            include: {
              document: {
                select: {
                  id: true,
                  fileName: true,
                  userId: true,
                  user: { select: { id: true, email: true, name: true } },
                },
              },
              clauses: true,
              issues: true,
            },
          },
        },
      });

      if (!draft) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
      }

      return draft;
    }),

  reviewSubmission: internalProcedure
    .input(
      z.object({
        id: z.string(),
        action: z.enum(["APPROVED", "REJECTED"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const draft = await ctx.prisma.skillDraft.findUnique({
        where: { id: input.id },
      });

      if (!draft) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
      }

      if (draft.status !== "SUBMITTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only review submissions in SUBMITTED status",
        });
      }

      if (input.action === "REJECTED" && !input.notes?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Review notes are required when rejecting a submission",
        });
      }

      const updated = await ctx.prisma.skillDraft.update({
        where: { id: input.id },
        data: {
          status: input.action,
          reviewedByUser: ctx.session.user.id,
          reviewNotes: input.notes || null,
        },
      });

      // Send notification to publisher
      try {
        const { notifyPublisherReviewResult } = await import("../services/notifications");
        await notifyPublisherReviewResult(input.id, input.action === "APPROVED");
      } catch (e) {
        console.error("Failed to send review notification:", e);
      }

      return updated;
    }),

  // ── Stats ──

  getStats: internalProcedure.query(async ({ ctx }) => {
    const [pendingSubmissions, totalPublishers, totalSkillsPublished, totalInvites] =
      await Promise.all([
        ctx.prisma.skillDraft.count({ where: { status: "SUBMITTED" } }),
        ctx.prisma.user.count({ where: { role: "PUBLISHER" } }),
        ctx.prisma.skillDraft.count({ where: { status: { in: ["APPROVED", "EXPORTED"] } } }),
        ctx.prisma.publisherInvite.count({ where: { active: true } }),
      ]);

    return { pendingSubmissions, totalPublishers, totalSkillsPublished, totalInvites };
  }),

  // ── Invite Management ──

  listInvites: internalProcedure.query(async ({ ctx }) => {
    return ctx.prisma.publisherInvite.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  createInvite: internalProcedure
    .input(
      z.object({
        code: z.string().min(3).max(64),
        label: z.string().optional(),
        maxUses: z.number().int().positive().optional(),
        expiresAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.publisherInvite.findUnique({
        where: { code: input.code },
      });

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "An invite with this code already exists" });
      }

      return ctx.prisma.publisherInvite.create({
        data: {
          code: input.code,
          label: input.label,
          maxUses: input.maxUses,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        },
      });
    }),

  deactivateInvite: internalProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.publisherInvite.update({
        where: { id: input.id },
        data: { active: false },
      });
    }),
});
