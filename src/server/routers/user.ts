import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publisherProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { requireStripe, stripe } from "@/lib/stripe";

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

  // ── Stripe Connect ──────────────────────────────────────────

  getStripeConnectStatus: publisherProcedure.query(async ({ ctx }) => {
    if (!stripe) {
      return { available: false, connected: false, complete: false, accountId: null };
    }

    const profile = await ctx.prisma.publisherProfile.findUnique({
      where: { userId: ctx.session.user.id },
      select: { stripeConnectAccountId: true, stripeConnectComplete: true },
    });

    if (!profile?.stripeConnectAccountId) {
      return { available: true, connected: false, complete: false, accountId: null };
    }

    // Check if onboarding is actually complete on Stripe's side
    if (!profile.stripeConnectComplete) {
      try {
        const account = await stripe.accounts.retrieve(profile.stripeConnectAccountId);
        if (account.charges_enabled && account.details_submitted) {
          await ctx.prisma.publisherProfile.update({
            where: { userId: ctx.session.user.id },
            data: { stripeConnectComplete: true },
          });
          return { available: true, connected: true, complete: true, accountId: profile.stripeConnectAccountId };
        }
      } catch {
        // Account may have been deleted on Stripe side
        return { available: true, connected: true, complete: false, accountId: profile.stripeConnectAccountId };
      }
    }

    return {
      available: true,
      connected: true,
      complete: profile.stripeConnectComplete,
      accountId: profile.stripeConnectAccountId,
    };
  }),

  createConnectOnboardingLink: publisherProcedure.mutation(async ({ ctx }) => {
    const s = requireStripe();
    const userId = ctx.session.user.id;

    // Ensure publisher profile exists
    let profile = await ctx.prisma.publisherProfile.findUnique({
      where: { userId },
      select: { stripeConnectAccountId: true },
    });

    if (!profile) {
      profile = await ctx.prisma.publisherProfile.create({
        data: { userId },
        select: { stripeConnectAccountId: true },
      });
    }

    let accountId = profile.stripeConnectAccountId;

    // Create Express account if none exists
    if (!accountId) {
      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      const account = await s.accounts.create({
        type: "express",
        email: user?.email,
        metadata: { clausemaster_user_id: userId },
        capabilities: {
          transfers: { requested: true },
        },
      });

      accountId = account.id;

      await ctx.prisma.publisherProfile.update({
        where: { userId },
        data: { stripeConnectAccountId: accountId, stripeConnectComplete: false },
      });
    }

    // Create account link for onboarding
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3002";
    const accountLink = await s.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api/stripe/connect/refresh`,
      return_url: `${baseUrl}/api/stripe/connect/return`,
      type: "account_onboarding",
    });

    return { url: accountLink.url };
  }),

  disconnectStripeConnect: publisherProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.publisherProfile.update({
      where: { userId: ctx.session.user.id },
      data: { stripeConnectAccountId: null, stripeConnectComplete: false },
    });
    return { success: true };
  }),
});
