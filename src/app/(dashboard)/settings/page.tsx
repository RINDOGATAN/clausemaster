"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Key, Shield, Trash2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const utils = trpc.useUtils();
  const [apiKey, setApiKey] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: status, isLoading } = trpc.settings.getApiKeyStatus.useQuery();

  const saveKey = trpc.settings.saveApiKey.useMutation({
    onSuccess: () => {
      toast.success(t("keySaved"));
      setApiKey("");
      setIsEditing(false);
      utils.settings.getApiKeyStatus.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteKey = trpc.settings.deleteApiKey.useMutation({
    onSuccess: () => {
      toast.success(t("keyDeleted"));
      setShowDeleteConfirm(false);
      utils.settings.getApiKeyStatus.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    saveKey.mutate({ apiKey: apiKey.trim() });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-muted-foreground">{tCommon("loading")}</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">{t("title")}</h1>

      <div className="card-brutal bg-card border border-border rounded-2xl p-6 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">{t("apiKeySection")}</h2>
        </div>

        {status?.isPrivileged ? (
          <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <Shield className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("platformKeyActive")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("platformKeyDescription")}</p>
            </div>
          </div>
        ) : status?.hasApiKey && !isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
              <div>
                <p className="text-sm font-medium text-foreground">{t("currentKey")}</p>
                <p className="text-sm text-muted-foreground font-mono">{status.maskedKey}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm font-medium bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                {t("changeKey")}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {tCommon("delete")}
              </button>
            </div>

            {showDeleteConfirm && (
              <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl space-y-3">
                <p className="text-sm text-foreground">{t("deleteConfirm")}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => deleteKey.mutate()}
                    disabled={deleteKey.isPending}
                    className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                  >
                    {deleteKey.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      tCommon("confirm")
                    )}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-sm font-medium bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    {tCommon("cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
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

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!apiKey.trim() || saveKey.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saveKey.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("saving")}
                  </>
                ) : (
                  tCommon("save")
                )}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setApiKey("");
                  }}
                  className="px-4 py-2 text-sm font-medium bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  {tCommon("cancel")}
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">{t("encryptionNotice")}</p>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-sm text-primary hover:underline"
              >
                {t("getApiKey")}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
