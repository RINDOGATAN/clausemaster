import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Resend } from "resend";
import prisma from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const isDev = process.env.NODE_ENV === "development";

// Build providers list dynamically
const providers: NextAuthOptions["providers"] = [];

// Google OAuth (optional)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

// Dev-only credentials provider (instant sign-in, no email needed)
if (isDev) {
  providers.push(
    CredentialsProvider({
      id: "dev-credentials",
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "dev@example.com" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        let user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: credentials.email,
              name: credentials.email.split("@")[0],
            },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    })
  );
}

// E2E test credentials provider — only active when E2E_CREDENTIALS_SECRET is set
if (process.env.E2E_CREDENTIALS_SECRET) {
  providers.push(
    CredentialsProvider({
      id: "e2e-credentials",
      name: "E2E Test",
      credentials: {
        email: { type: "email" },
        secret: { type: "password" },
      },
      async authorize(credentials) {
        if (
          !credentials?.secret ||
          credentials.secret !== process.env.E2E_CREDENTIALS_SECRET
        ) {
          return null;
        }
        const email = credentials.email;
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: { email, emailVerified: new Date() },
          });
        }
        return { id: user.id, email: user.email, name: user.name };
      },
    })
  );
}

// Magic link email (always available)
providers.push(
  EmailProvider({
    from: process.env.EMAIL_FROM,
    sendVerificationRequest: async ({ identifier: email, url }) => {
      if (!resend) {
        console.log(`[Auth] Magic link for ${email}: ${url}`);
        return;
      }
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "onboarding@resend.dev",
          to: email,
          subject: "Sign in to Clausemaster",
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
              <h1 style="color: #f5a623; background: #1a1a1a; padding: 20px; margin: 0;">Clausemaster</h1>
              <div style="padding: 20px; background: #f5f5f5;">
                <p>Click the button below to sign in to Clausemaster:</p>
                <a href="${url}" style="display: inline-block; background: #1a1a1a; color: #f5a623; padding: 12px 24px; text-decoration: none; font-weight: bold; margin: 20px 0;">Sign In</a>
                <p style="color: #666; font-size: 14px;">If you didn't request this email, you can safely ignore it.</p>
                <p style="color: #666; font-size: 12px;">Or copy this link: ${url}</p>
              </div>
            </div>
          `,
        });
      } catch (error) {
        console.error("Failed to send verification email:", error);
        throw new Error("Failed to send verification email");
      }
    },
  })
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }
      return session;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        token.role = dbUser?.role ?? "CLIENT";
      }
      // Refresh role from DB on session update (e.g. after onboarding)
      if (trigger === "update" && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true },
        });
        token.role = dbUser?.role ?? "CLIENT";
      }
      return token;
    },
  },
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/verify-request",
    error: "/auth-error",
  },
};
