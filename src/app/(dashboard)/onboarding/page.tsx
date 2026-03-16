"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2, Scale, UserCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const t = useTranslations("onboarding");
  const [inviteCode, setInviteCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);

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

  const handleSkip = () => {
    completeMutation.mutate({});
  };

  return (
    <div className="max-w-lg mx-auto py-16">
      <div className="card-brutal p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        {!showCodeInput ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {t("publisherQuestion")}
            </p>

            <button
              onClick={() => setShowCodeInput(true)}
              className="w-full flex items-center gap-3 px-4 py-4 bg-secondary hover:bg-secondary/80 border border-border rounded-xl transition-colors text-left"
            >
              <Scale className="w-5 h-5 text-primary shrink-0" />
              <div>
                <div className="font-medium">{t("yesImALawyer")}</div>
                <div className="text-sm text-muted-foreground">
                  {t("yesDescription")}
                </div>
              </div>
            </button>

            <button
              onClick={handleSkip}
              disabled={completeMutation.isPending}
              className="w-full flex items-center gap-3 px-4 py-4 bg-secondary hover:bg-secondary/80 border border-border rounded-xl transition-colors text-left"
            >
              <UserCheck className="w-5 h-5 text-primary shrink-0" />
              <div>
                <div className="font-medium">{t("skipAsClient")}</div>
                <div className="text-sm text-muted-foreground">
                  {t("skipDescription")}
                </div>
              </div>
              {completeMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin ml-auto" />
              )}
            </button>
          </div>
        ) : (
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

            <div className="flex gap-3">
              <button
                onClick={() => setShowCodeInput(false)}
                className="flex-1 px-4 py-3 bg-secondary hover:bg-secondary/80 border border-border rounded-xl transition-colors text-sm font-medium"
              >
                {t("back")}
              </button>
              <button
                onClick={handleSubmitCode}
                disabled={!inviteCode.trim() || completeMutation.isPending}
                className="flex-1 btn-brutal px-4 py-3 inline-flex items-center justify-center gap-2"
              >
                {completeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                {t("verifyCode")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
