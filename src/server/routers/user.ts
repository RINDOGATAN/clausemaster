import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publisherProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const PRIVILEGED_DOMAINS = ["todo.law", "rindogatan.com"];

export const userRouter = createTRPCRouter({
  getRole: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { role: true, onboardedAt: true },
    });
    return {
      role: user?.role ?? "CLIENT",
      onboardedAt: user?.onboardedAt ?? null,
    };
  }),

  completeOnboarding: protectedProcedure
    .input(
      z.object({
        inviteCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, onboardedAt: true },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Already onboarded
      if (user.onboardedAt) {
        return { role: ctx.session.user.role };
      }

      const emailDomain = user.email.split("@")[1]?.toLowerCase();

      // Auto-detect internal users by privileged domain
      if (emailDomain && PRIVILEGED_DOMAINS.includes(emailDomain)) {
        const updated = await ctx.prisma.user.update({
          where: { id: userId },
          data: { role: "INTERNAL", onboardedAt: new Date() },
          select: { role: true },
        });
        return { role: updated.role };
      }

      // Publisher invite code flow
      if (input.inviteCode) {
        const invite = await ctx.prisma.publisherInvite.findUnique({
          where: { code: input.inviteCode },
        });

        if (!invite || !invite.active) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid invite code" });
        }

        if (invite.expiresAt && invite.expiresAt < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invite code has expired" });
        }

        if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invite code has reached its usage limit" });
        }

        // Set role and increment usage in a transaction
        const [updated] = await ctx.prisma.$transaction([
          ctx.prisma.user.update({
            where: { id: userId },
            data: { role: "PUBLISHER", onboardedAt: new Date() },
            select: { role: true },
          }),
          ctx.prisma.publisherInvite.update({
            where: { id: invite.id },
            data: { usedCount: { increment: 1 } },
          }),
        ]);

        return { role: updated.role };
      }

      // Default: CLIENT
      const updated = await ctx.prisma.user.update({
        where: { id: userId },
        data: { role: "CLIENT", onboardedAt: new Date() },
        select: { role: true },
      });

      return { role: updated.role };
    }),

  getPublisherProfile: publisherProcedure.query(async ({ ctx }) => {
    return ctx.prisma.publisherProfile.findUnique({
      where: { userId: ctx.session.user.id },
    });
  }),

  updatePublisherProfile: publisherProcedure
    .input(
      z.object({
        firmName: z.string().max(200).optional(),
        bio: z.string().max(2000).optional(),
        specialties: z.array(z.string()).max(10).optional(),
        website: z.string().url().max(500).optional().or(z.literal("")),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.publisherProfile.upsert({
        where: { userId: ctx.session.user.id },
        create: {
          userId: ctx.session.user.id,
          firmName: input.firmName,
          bio: input.bio,
          specialties: input.specialties ?? [],
          website: input.website || null,
        },
        update: {
          firmName: input.firmName,
          bio: input.bio,
          specialties: input.specialties ?? [],
          website: input.website || null,
        },
      });
    }),
});
