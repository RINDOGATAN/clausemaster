import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publisherProcedure } from "../trpc";

export const reviewRouter = createTRPCRouter({
  // ── Client Procedures ──

  /** Client requests a lawyer review for their document */
  requestReview: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        clientNotes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the document belongs to the user
      const doc = await ctx.prisma.document.findUnique({
        where: { id: input.documentId },
      });

      if (!doc || doc.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }

      if (doc.status !== "COMPLETED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Document must be fully analyzed first" });
      }

      // Check for existing active request
      const existing = await ctx.prisma.reviewRequest.findFirst({
        where: {
          documentId: input.documentId,
          clientId: ctx.session.user.id,
          status: { in: ["PENDING", "CLAIMED"] },
        },
      });

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "A review request already exists for this document" });
      }

      const request = await ctx.prisma.reviewRequest.create({
        data: {
          documentId: input.documentId,
          clientId: ctx.session.user.id,
          clientNotes: input.clientNotes || null,
        },
      });

      // Notify publishers
      try {
        const { notifyPublishersNewReview } = await import("../services/notifications");
        await notifyPublishersNewReview(request.id);
      } catch (e) {
        console.error("Failed to send review notification:", e);
      }

      return request;
    }),

  /** Client gets review status for their document */
  getByDocument: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.reviewRequest.findFirst({
        where: {
          documentId: input.documentId,
          clientId: ctx.session.user.id,
        },
        orderBy: { createdAt: "desc" },
        include: {
          publisher: { select: { name: true } },
        },
      });
    }),

  /** Client cancels their own review request */
  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.prisma.reviewRequest.findUnique({
        where: { id: input.id },
      });

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Client can cancel their own, publisher can cancel ones they claimed
      const isClient = request.clientId === ctx.session.user.id;
      const isPublisher = request.publisherId === ctx.session.user.id;

      if (!isClient && !isPublisher) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (request.status === "COMPLETED" || request.status === "CANCELLED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot cancel a completed or already cancelled request" });
      }

      return ctx.prisma.reviewRequest.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });
    }),

  // ── Publisher Procedures ──

  /** List pending review requests available to claim */
  listAvailable: publisherProcedure.query(async ({ ctx }) => {
    return ctx.prisma.reviewRequest.findMany({
      where: { status: "PENDING" },
      include: {
        document: {
          select: {
            id: true,
            fileName: true,
            status: true,
            analysis: {
              select: {
                contractType: true,
                contractTypeLabel: true,
                jurisdiction: true,
                clauses: { select: { id: true } },
                issues: { select: { id: true, severity: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  /** List reviews claimed by this publisher */
  listMine: publisherProcedure.query(async ({ ctx }) => {
    return ctx.prisma.reviewRequest.findMany({
      where: { publisherId: ctx.session.user.id },
      include: {
        document: {
          select: {
            id: true,
            fileName: true,
            analysis: {
              select: {
                contractType: true,
                contractTypeLabel: true,
                jurisdiction: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }),

  /** Publisher claims a pending review */
  claim: publisherProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.prisma.reviewRequest.findUnique({
        where: { id: input.id },
      });

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (request.status !== "PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This review has already been claimed" });
      }

      const updated = await ctx.prisma.reviewRequest.update({
        where: { id: input.id },
        data: {
          status: "CLAIMED",
          publisherId: ctx.session.user.id,
        },
      });

      // Notify client
      try {
        const { notifyClientReviewClaimed } = await import("../services/notifications");
        await notifyClientReviewClaimed(input.id);
      } catch (e) {
        console.error("Failed to send claim notification:", e);
      }

      return updated;
    }),

  /** Publisher gets full analysis for a claimed review (read-only access) */
  getReviewAnalysis: publisherProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const request = await ctx.prisma.reviewRequest.findUnique({
        where: { id: input.id },
        include: {
          document: {
            select: {
              id: true,
              fileName: true,
              analysis: {
                include: {
                  clauses: {
                    include: { issues: true },
                    orderBy: { order: "asc" },
                  },
                  issues: {
                    orderBy: { severity: "asc" },
                  },
                },
              },
            },
          },
        },
      });

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Only the assigned publisher (or INTERNAL) can view
      if (request.publisherId !== ctx.session.user.id && ctx.session.user.role !== "INTERNAL") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return request;
    }),

  /** Publisher completes a review with notes */
  complete: publisherProcedure
    .input(
      z.object({
        id: z.string(),
        reviewNotes: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.prisma.reviewRequest.findUnique({
        where: { id: input.id },
      });

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (request.publisherId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (request.status !== "CLAIMED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only complete reviews in CLAIMED status" });
      }

      const updated = await ctx.prisma.reviewRequest.update({
        where: { id: input.id },
        data: {
          status: "COMPLETED",
          reviewNotes: input.reviewNotes,
        },
      });

      // Notify client
      try {
        const { notifyClientReviewCompleted } = await import("../services/notifications");
        await notifyClientReviewCompleted(input.id);
      } catch (e) {
        console.error("Failed to send completion notification:", e);
      }

      return updated;
    }),
});
