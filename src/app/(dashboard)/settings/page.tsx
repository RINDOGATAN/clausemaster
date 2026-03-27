"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  Cpu,
  Shield,
  Trash2,
  Loader2,
  ExternalLink,
  Briefcase,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Zap,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function SettingsPage() {
  const { data: session } = useSession();
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const userRole = session?.user?.role;
  const isPublisher = userRole === "PUBLISHER" || userRole === "INTERNAL";

  const { data: status, isLoading } = trpc.settings.getAIProviderStatus.useQuery();

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

      {/* AI Provider Section */}
      <AIProviderSection status={status} />

      {/* Publisher Profile Section */}
      {isPublisher && <PublisherProfileSection />}

      {/* Stripe Connect Section */}
      {isPublisher && <StripeConnectSection />}
    </div>
  );
}

// ─── AI Provider Section ─────────────────────────────────────────────────────

type ProviderStatus = {
  provider: string;
  providerLabel: string;
  model: string;
  hasApiKey: boolean;
  isPrivileged: boolean;
  maskedKey: string | null;
  communityAvailable: boolean;
};

function AIProviderSection({ status }: { status: ProviderStatus | undefined }) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const utils = trpc.useUtils();

  const [isEditing, setIsEditing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("COMMUNITY");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");

  const { data: providerOpts } = trpc.settings.getProviderOptions.useQuery();

  const saveProvider = trpc.settings.saveAIProvider.useMutation({
    onSuccess: () => {
      toast.success(t("keySaved"));
      setApiKey("");
      setIsEditing(false);
      utils.settings.getAIProviderStatus.invalidate();
      utils.settings.getApiKeyStatus.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetProvider = trpc.settings.resetAIProvider.useMutation({
    onSuccess: () => {
      toast.success(t("keyDeleted"));
      setIsEditing(false);
      utils.settings.getAIProviderStatus.invalidate();
      utils.settings.getApiKeyStatus.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  // Sync selected provider with current status when entering edit mode
  useEffect(() => {
    if (isEditing && status) {
      setSelectedProvider(status.provider);
      setModel(status.model || "");
    }
  }, [isEditing, status]);

  const providers = providerOpts?.providers ?? [];
  const currentProviderDef = providers.find((p) => p.value === selectedProvider);
  const requiresKey = currentProviderDef?.requiresKey ?? false;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveProvider.mutate({
      provider: selectedProvider as "COMMUNITY" | "ANTHROPIC" | "OPENAI" | "GROQ" | "MISTRAL" | "TOGETHER",
      apiKey: requiresKey ? apiKey.trim() : undefined,
      model: model.trim() || undefined,
    });
  };

  const handleSelectCommunity = () => {
    saveProvider.mutate({ provider: "COMMUNITY" });
  };

  // Privileged domain users
  if (status?.isPrivileged) {
    return (
      <div className="card-brutal bg-card border border-border rounded-2xl p-6 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">{t("aiProviderSection")}</h2>
        </div>
        <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
          <Shield className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{t("platformKeyActive")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("platformKeyDescription")}</p>
          </div>
        </div>
      </div>
    );
  }

  // Display mode (not editing)
  if (!isEditing) {
    const isCommunity = status?.provider === "COMMUNITY";

    return (
      <div className="card-brutal bg-card border border-border rounded-2xl p-6 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">{t("aiProviderSection")}</h2>
        </div>

        {isCommunity ? (
          <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
            <Zap className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("communityActive")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("communityTierDescription")}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
            <div>
              <p className="text-sm font-medium text-foreground">{status?.providerLabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {status?.model}
                {status?.maskedKey && <span className="ml-2 font-mono">{status.maskedKey}</span>}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsEditing(true)}
          className="mt-4 px-4 py-2 text-sm font-medium bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
        >
          {t("changeKey")}
        </button>
      </div>
    );
  }

  // Editing mode
  return (
    <div className="card-brutal bg-card border border-border rounded-2xl p-6 shadow-card">
      <div className="flex items-center gap-3 mb-4">
        <Cpu className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{t("aiProviderSection")}</h2>
      </div>

      {/* Tier selector */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Community tier card */}
        <button
          type="button"
          onClick={handleSelectCommunity}
          disabled={saveProvider.isPending || !status?.communityAvailable}
          className={`text-left p-4 rounded-xl border-2 transition-all ${
            !status?.communityAvailable
              ? "border-border opacity-50 cursor-not-allowed"
              : "border-green-500/40 hover:border-green-500 bg-green-500/5"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-green-500" />
            <span className="text-sm font-semibold text-foreground">{t("communityTier")}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {status?.communityAvailable ? t("communityTierDescription") : t("communityNotAvailable")}
          </p>
        </button>

        {/* Pro tier card */}
        <div
          className="text-left p-4 rounded-xl border-2 border-primary/40 bg-primary/5"
        >
          <div className="flex items-center gap-2 mb-1">
            <Key className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{t("proTier")}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t("proTierDescription")}</p>
        </div>
      </div>

      {/* Pro tier form */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* Provider selector */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {t("selectProvider")}
          </label>
          <select
            value={selectedProvider}
            onChange={(e) => {
              setSelectedProvider(e.target.value);
              setApiKey("");
              setModel("");
            }}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          >
            {providers
              .filter((p) => p.requiresKey)
              .map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
          </select>
        </div>

        {/* API key input */}
        {requiresKey && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t("apiKeyLabel")}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={currentProviderDef?.keyPlaceholder || "..."}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              autoFocus
            />
          </div>
        )}

        {/* Model override (optional) */}
        {requiresKey && currentProviderDef?.models && currentProviderDef.models.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t("modelOverride")}
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            >
              {currentProviderDef.models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!apiKey.trim() || saveProvider.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveProvider.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("saving")}
              </>
            ) : (
              tCommon("save")
            )}
          </button>
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
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">{t("encryptionNotice")}</p>
          {currentProviderDef?.keyUrl && (
            <a
              href={currentProviderDef.keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-sm text-primary hover:underline"
            >
              {t("getApiKey")}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </form>
    </div>
  );
}

// ─── Stripe Connect Section ──────────────────────────────────────────────────

function StripeConnectSection() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const utils = trpc.useUtils();
  const searchParams = useSearchParams();

  const { data: connectStatus, isLoading } = trpc.user.getStripeConnectStatus.useQuery();

  const createLink = trpc.user.createConnectOnboardingLink.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const disconnect = trpc.user.disconnectStripeConnect.useMutation({
    onSuccess: () => {
      toast.success(t("stripeDisconnected"));
      utils.user.getStripeConnectStatus.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  useEffect(() => {
    const stripeParam = searchParams.get("stripe");
    if (stripeParam === "connected") {
      utils.user.getStripeConnectStatus.invalidate();
      toast.success(t("stripeReturnSuccess"));
      window.history.replaceState({}, "", "/settings");
    } else if (stripeParam === "refresh") {
      toast.info(t("stripeRefreshNotice"));
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams, t, utils]);

  if (isLoading) return null;
  if (!connectStatus?.available) return null;

  return (
    <div className="card-brutal bg-card border border-border rounded-2xl p-6 shadow-card mt-6">
      <div className="flex items-center gap-3 mb-4">
        <CreditCard className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{t("stripeConnect")}</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-4">{t("stripeConnectDescription")}</p>

      {connectStatus.connected && connectStatus.complete ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("stripeConnected")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("stripeConnectedDescription")}</p>
            </div>
          </div>

          {!showDisconnectConfirm ? (
            <button
              onClick={() => setShowDisconnectConfirm(true)}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              {t("stripeDisconnect")}
            </button>
          ) : (
            <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl space-y-3">
              <p className="text-sm text-foreground">{t("stripeDisconnectConfirm")}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => disconnect.mutate()}
                  disabled={disconnect.isPending}
                  className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                >
                  {disconnect.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("stripeDisconnectAction")}
                </button>
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="px-4 py-2 text-sm font-medium bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  {tCommon("cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : connectStatus.connected && !connectStatus.complete ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("stripeIncomplete")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("stripeIncompleteDescription")}</p>
            </div>
          </div>
          <button
            onClick={() => createLink.mutate()}
            disabled={createLink.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {createLink.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("stripeCompleteSetup")}
          </button>
        </div>
      ) : (
        <button
          onClick={() => createLink.mutate()}
          disabled={createLink.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {createLink.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("stripeConnecting")}
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              {t("stripeConnectAction")}
            </>
          )}
        </button>
      )}

      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-muted-foreground">{t("stripeConnectFooter")}</p>
        <a
          href="/docs/revenue-share"
          className="text-xs text-primary hover:underline flex-shrink-0 ml-4"
        >
          {t("stripeLearnMore")}
        </a>
      </div>
    </div>
  );
}

// ─── Publisher Profile Section ────────────────────────────────────────────────

function PublisherProfileSection() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const utils = trpc.useUtils();

  const { data: profile, isLoading } = trpc.user.getPublisherProfile.useQuery();

  const [firmName, setFirmName] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    if (profile) {
      setFirmName(profile.firmName || "");
      setBio(profile.bio || "");
      setSpecialties(profile.specialties.join(", "));
      setWebsite(profile.website || "");
    }
  }, [profile]);

  const updateProfile = trpc.user.updatePublisherProfile.useMutation({
    onSuccess: () => {
      toast.success(t("profileSaved"));
      utils.user.getPublisherProfile.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      firmName: firmName.trim() || undefined,
      bio: bio.trim() || undefined,
      specialties: specialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      website: website.trim() || "",
    });
  };

  if (isLoading) return null;

  return (
    <div className="card-brutal bg-card border border-border rounded-2xl p-6 shadow-card mt-6">
      <div className="flex items-center gap-3 mb-4">
        <Briefcase className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{t("publisherProfile")}</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t("firmName")}</label>
          <input
            value={firmName}
            onChange={(e) => setFirmName(e.target.value)}
            placeholder={t("firmNamePlaceholder")}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t("bio")}</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t("bioPlaceholder")}
            rows={3}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t("specialties")}</label>
          <input
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            placeholder={t("specialtiesPlaceholder")}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">{t("specialtiesHint")}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t("website")}</label>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {updateProfile.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("saving")}
            </>
          ) : (
            tCommon("save")
          )}
        </button>
      </form>
    </div>
  );
}
