"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Key, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function SetupPage() {
  const t = useTranslations("setup");
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");

  const saveKey = trpc.settings.saveApiKey.useMutation({
    onSuccess: () => {
      toast.success(t("keySaved"));
      router.push("/documents");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    saveKey.mutate({ apiKey: apiKey.trim() });
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md">
        <div className="card-brutal bg-card border border-border rounded-2xl p-8 shadow-card">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Key className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
            <p className="text-muted-foreground mt-2">{t("description")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-foreground mb-1.5">
                {t("apiKeyLabel")}
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!apiKey.trim() || saveKey.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saveKey.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                t("saveAndContinue")
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-border space-y-3">
            <p className="text-xs text-muted-foreground text-center">{t("encryptionNotice")}</p>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-sm text-primary hover:underline"
            >
              {t("getApiKey")}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
