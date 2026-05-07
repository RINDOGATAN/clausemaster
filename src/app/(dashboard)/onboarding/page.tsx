"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2, FileText, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const t = useTranslations("onboarding");
  const [inviteCode, setInviteCode] = useState("");
  const [publisherOpen, setPublisherOpen] = useState(false);

  const completeMutation = trpc.user.completeOnboarding.useMutation({
    onSuccess: async (data) => {
      // Refresh the session so role is available immediately
      await updateSession();
      toast.success(
        data.role === "PUBLISHER"
          ? t("welcomePublisher")
          : data.role === "INTERNAL"
          ? t("welcomeInternal")
          : t("welcomeClient")
      );
      router.push(data.role === "PUBLISHER" ? "/publisher-setup" : "/documents");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleContinueAsClient = () => {
    completeMutation.mutate({ asClient: true });
  };

  const handleSubmitCode = () => {
    if (!inviteCode.trim()) return;
    completeMutation.mutate({ inviteCode: inviteCode.trim() });
  };

  const handleUseExpertDirectory = () => {
    completeMutation.mutate({ useExpertDirectory: true });
  };

  const isPending = completeMutation.isPending;

  return (
    <div className="max-w-lg mx-auto py-12">
      <div className="card-brutal p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* Primary path: continue as client */}
        <div className="space-y-3">
          <button
            onClick={handleContinueAsClient}
            disabled={isPending}
            className="w-full btn-brutal px-4 py-4 inline-flex items-center justify-center gap-3"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            <span className="text-base font-semibold">{t("continueAsClient")}</span>
          </button>
          <p className="text-xs text-muted-foreground text-center">
            {t("clientDescription")}
          </p>
        </div>

        {/* Secondary path: apply as publisher (collapsed by default) */}
        <div className="border-t border-border pt-6">
          <button
            type="button"
            onClick={() => setPublisherOpen((v) => !v)}
            className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              {t("publisherToggle")}
            </span>
            {publisherOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {publisherOpen && (
            <div className="mt-5 space-y-5">
              <p className="text-xs text-muted-foreground">
                {t("publisherDescription")}
              </p>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  {t("enterCode")}
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitCode()}
                  placeholder={t("codePlaceholder")}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={handleSubmitCode}
                  disabled={!inviteCode.trim() || isPending}
                  className="w-full btn-brutal-outline px-4 py-2.5 inline-flex items-center justify-center gap-2 text-sm"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t("verifyCode")}
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground">
                    {t("orDivider")}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {t("expertDirectoryDescription")}
                </p>
                <button
                  onClick={handleUseExpertDirectory}
                  disabled={isPending}
                  className="w-full btn-brutal-outline px-4 py-2.5 inline-flex items-center justify-center gap-2 text-sm"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t("useExpertDirectory")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
