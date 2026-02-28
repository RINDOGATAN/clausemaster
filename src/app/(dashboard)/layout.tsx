"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  FileText,
  Plus,
  LogOut,
  User,
  Menu,
  X,
  Settings,
  Layers,
  Shield,
  Scale,
} from "lucide-react";
import { brand } from "@/config/brand";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { trpc } from "@/lib/trpc";
import type { UserRole } from "@prisma/client";

type NavItem = {
  href: string;
  label: string;
  icon: typeof FileText;
  roles: UserRole[];
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: apiKeyStatus, isLoading: apiKeyLoading } = trpc.settings.getApiKeyStatus.useQuery(
    undefined,
    { enabled: status === "authenticated" }
  );

  const { data: userInfo, isLoading: userInfoLoading } = trpc.user.getRole.useQuery(
    undefined,
    { enabled: status === "authenticated" }
  );

  if (status === "loading" || (status === "authenticated" && (apiKeyLoading || userInfoLoading))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">{tCommon("loading")}</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    redirect("/sign-in");
  }

  const userRole: UserRole = userInfo?.role as UserRole ?? "CLIENT";
  const isOnboarded = !!userInfo?.onboardedAt;
  const isOnboardingPage = pathname === "/onboarding";

  // Redirect to onboarding if not onboarded (but don't redirect if already on onboarding page)
  if (!isOnboarded && !isOnboardingPage) {
    redirect("/onboarding");
  }

  // Redirect to setup if no API key configured (skip for /setup, /settings, and /onboarding pages)
  const needsSetup = apiKeyStatus && !apiKeyStatus.hasApiKey;
  const isSetupPage = pathname === "/setup";
  const isSettingsPage = pathname === "/settings";

  if (needsSetup && !isSetupPage && !isSettingsPage && !isOnboardingPage) {
    redirect("/setup");
  }

  const allNavItems: NavItem[] = [
    { href: "/documents", label: t("myDocuments"), icon: FileText, roles: ["INTERNAL", "PUBLISHER", "CLIENT"] },
    { href: "/documents/new", label: t("uploadNew"), icon: Plus, roles: ["INTERNAL", "PUBLISHER", "CLIENT"] },
    { href: "/my-skills", label: t("mySkills"), icon: Layers, roles: ["PUBLISHER"] },
    { href: "/reviews", label: t("reviews"), icon: Scale, roles: ["PUBLISHER"] },
    { href: "/admin", label: t("admin"), icon: Shield, roles: ["INTERNAL"] },
    { href: "/settings", label: t("settings"), icon: Settings, roles: ["INTERNAL", "PUBLISHER", "CLIENT"] },
  ];

  const navItems = allNavItems.filter((item) => item.roles.includes(userRole));

  return (
    <div className="min-h-screen bg-background">
      {/* Floating Glassmorphism Header */}
      <header className="sticky top-0 z-20 px-4 pt-3">
        <div className="max-w-7xl mx-auto bg-card/80 backdrop-blur-md border border-border rounded-xl md:rounded-full px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href="/documents" className="text-lg font-bold tracking-tight text-foreground">
              TODO.LAW<sup className="text-xs align-super">&#8482;</sup>{" "}
              <span className="text-primary">CLAUSEMASTER</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href ||
                  (item.href !== "/documents" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-2 px-4 py-2 text-sm font-medium
                      rounded-full transition-colors
                      ${isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <LanguageSwitcher />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{session?.user?.email}</span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/sign-in" })}
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t("signOut")}
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-30 md:hidden">
          <div className="flex flex-col h-full p-6">
            <div className="flex items-center justify-between mb-8">
              <Link href="/documents" className="text-lg font-bold tracking-tight text-foreground" onClick={() => setMobileMenuOpen(false)}>
                TODO.LAW<sup className="text-xs align-super">&#8482;</sup>{" "}
                <span className="text-primary">CLAUSEMASTER</span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-2 flex-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href ||
                  (item.href !== "/documents" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 text-lg font-medium
                      rounded-xl transition-colors
                      ${isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border pt-6 space-y-4">
              <LanguageSwitcher />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{session?.user?.email}</span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/sign-in" })}
                className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary transition-colors w-full"
              >
                <LogOut className="w-4 h-4" />
                {t("signOut")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          {brand.shortName} is a{" "}
          <a
            href={brand.links.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {brand.company}
          </a>{" "}
          service.{" "}
          <a
            href={brand.links.terms}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Terms of Use
          </a>{" "}
          &middot;{" "}
          <a
            href={brand.links.privacy}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Privacy Notice
          </a>
        </div>
      </footer>
    </div>
  );
}
