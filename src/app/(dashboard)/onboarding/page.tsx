"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const t = useTranslations("onboarding");
  const [inviteCode, setInviteCode] = useState("");

  const completeMutation = trpc.user.completeOnboarding.useMutation({
    onSuccess: async (data) => {
      // Refresh the session so role is available immediately
      await updateSession();
      toast.success(
        data.role === "PUBLISHER"
          ? t("welcomePublisher")
          : t("welcomeInternal")
      );
      // Send publishers to the guided setup wizard, others to documents
      router.push(data.role === "PUBLISHER" ? "/publisher-setup" : "/documents");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmitCode = () => {
    if (!inviteCode.trim()) return;
    completeMutation.mutate({ inviteCode: inviteCode.trim() });
  };

  return (
    <div className="max-w-lg mx-auto py-16">
      <div className="card-brutal p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("enterCode")}
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmitCode()}
              placeholder={t("codePlaceholder")}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>

          <button
            onClick={handleSubmitCode}
            disabled={!inviteCode.trim() || completeMutation.isPending}
            className="w-full btn-brutal px-4 py-3 inline-flex items-center justify-center gap-2"
          >
            {completeMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            {t("verifyCode")}
          </button>
        </div>
      </div>
    </div>
  );
}
