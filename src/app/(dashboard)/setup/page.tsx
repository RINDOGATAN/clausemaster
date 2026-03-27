"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Cpu, Key, ExternalLink, Loader2, ArrowRight, Zap } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function SetupPage() {
  const t = useTranslations("setup");
  const router = useRouter();
  const [showProForm, setShowProForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("ANTHROPIC");
  const [apiKey, setApiKey] = useState("");

  const { data: providerOpts } = trpc.settings.getProviderOptions.useQuery();
  const { data: status } = trpc.settings.getAIProviderStatus.useQuery();

  const saveProvider = trpc.settings.saveAIProvider.useMutation({
    onSuccess: () => {
      toast.success(t("keySaved"));
      router.push("/documents");
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const providers = providerOpts?.providers ?? [];
  const currentProviderDef = providers.find((p) => p.value === selectedProvider);

  const handleCommunity = () => {
    saveProvider.mutate({ provider: "COMMUNITY" });
  };

  const handleProSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    saveProvider.mutate({
      provider: selectedProvider as "ANTHROPIC" | "OPENAI" | "GROQ" | "MISTRAL" | "TOGETHER",
      apiKey: apiKey.trim(),
    });
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md">
        <div className="card-brutal bg-card border border-border rounded-2xl p-8 shadow-card">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Cpu className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
            <p className="text-muted-foreground mt-2">{t("description")}</p>
          </div>

          <div className="space-y-3">
            {/* Community option */}
            {status?.communityAvailable && (
              <button
                type="button"
                onClick={handleCommunity}
                disabled={saveProvider.isPending}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-green-500/40 bg-green-500/5 hover:border-green-500 transition-all text-left"
              >
                <Zap className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{t("communityOption")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("communityOptionDescription")}</p>
                </div>
                {saveProvider.isPending && <Loader2 className="w-4 h-4 animate-spin text-green-500" />}
              </button>
            )}

            {/* Pro option */}
            {!showProForm ? (
              <button
                type="button"
                onClick={() => setShowProForm(true)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-primary/40 transition-all text-left"
              >
                <Key className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{t("bringKeyOption")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("bringKeyDescription")}</p>
                </div>
              </button>
            ) : (
              <form onSubmit={handleProSubmit} className="space-y-4 p-4 rounded-xl border-2 border-primary/40 bg-primary/5">
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    setSelectedProvider(e.target.value);
                    setApiKey("");
                  }}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {providers
                    .filter((p) => p.requiresKey)
                    .map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                </select>

                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={currentProviderDef?.keyPlaceholder || "..."}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={!apiKey.trim() || saveProvider.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saveProvider.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("saving")}
                    </>
                  ) : (
                    t("saveAndContinue")
                  )}
                </button>

                <div className="text-center space-y-2">
                  <p className="text-xs text-muted-foreground">{t("encryptionNotice")}</p>
                  {currentProviderDef?.keyUrl && (
                    <a
                      href={currentProviderDef.keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      {t("getApiKey")}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </form>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <Link
              href="/publisher-setup"
              className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("skipForNow")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
