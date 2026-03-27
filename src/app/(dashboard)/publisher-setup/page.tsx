"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Briefcase,
  CreditCard,
  Cpu,
  Rocket,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Zap,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const STEPS = ["profile", "stripe", "aiProvider", "ready"] as const;
type Step = (typeof STEPS)[number];

export default function PublisherSetupPage() {
  const t = useTranslations("publisherSetup");
  const searchParams = useSearchParams();
  const stripeParam = searchParams.get("stripe");

  // Start on the Stripe step if returning from Stripe onboarding
  const [currentStep, setCurrentStep] = useState<Step>(
    stripeParam ? "stripe" : "profile"
  );
  const currentIndex = STEPS.indexOf(currentStep);

  // Show toast on return from Stripe (once only)
  useEffect(() => {
    if (stripeParam === "connected") {
      toast.success(t("stripeConnected"));
      window.history.replaceState({}, "", "/publisher-setup");
    } else if (stripeParam === "refresh") {
      toast.info(t("stripeIncomplete"));
      window.history.replaceState({}, "", "/publisher-setup");
    }
  }, [stripeParam, t]);

  const goNext = () => {
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((step, i) => {
            const isCompleted = i < currentIndex;
            const isCurrent = i === currentIndex;
            const icons = [Briefcase, CreditCard, Cpu, Rocket];
            const Icon = icons[i];

            return (
              <div key={step} className="flex items-center flex-1">
                <button
                  onClick={() => i <= currentIndex && setCurrentStep(STEPS[i])}
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all
                    ${isCompleted ? "bg-green-500 text-white" : ""}
                    ${isCurrent ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : ""}
                    ${!isCompleted && !isCurrent ? "bg-secondary text-muted-foreground" : ""}
                    ${i <= currentIndex ? "cursor-pointer" : "cursor-default"}
                  `}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-colors ${
                      i < currentIndex ? "bg-green-500" : "bg-secondary"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {t("stepOf", { current: currentIndex + 1, total: STEPS.length })}
        </p>
      </div>

      {/* Step content */}
      <div className="card-brutal bg-card border border-border rounded-2xl p-8 shadow-card">
        {currentStep === "profile" && <ProfileStep onNext={goNext} />}
        {currentStep === "stripe" && <StripeStep onNext={goNext} onBack={goBack} />}
        {currentStep === "aiProvider" && <AIProviderStep onNext={goNext} onBack={goBack} />}
        {currentStep === "ready" && <ReadyStep />}
      </div>
    </div>
  );
}

// ── Step 1: Profile ──────────────────────────────────────────────

function ProfileStep({ onNext }: { onNext: () => void }) {
  const t = useTranslations("publisherSetup");
  const tCommon = useTranslations("common");

  const { data: profile, isLoading } = trpc.user.getPublisherProfile.useQuery();
  const utils = trpc.useUtils();

  const [firmName, setFirmName] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    if (profile) {
      setFirmName(profile.firmName || "");
      setSpecialties(profile.specialties.join(", "));
      setBio(profile.bio || "");
      setWebsite(profile.website || "");
    }
  }, [profile]);

  const updateProfile = trpc.user.updatePublisherProfile.useMutation({
    onSuccess: () => {
      toast.success(t("profileSaved"));
      utils.user.getPublisherProfile.invalidate();
      onNext();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      firmName: firmName.trim() || undefined,
      bio: bio.trim() || undefined,
      specialties: specialties.split(",").map((s) => s.trim()).filter(Boolean),
      website: website.trim() || "",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">{t("profileTitle")}</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">{t("profileDescription")}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">{t("firmName")}</label>
          <input
            value={firmName}
            onChange={(e) => setFirmName(e.target.value)}
            placeholder={t("firmNamePlaceholder")}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t("specialties")}</label>
          <input
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            placeholder={t("specialtiesPlaceholder")}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">{t("specialtiesHint")}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t("bio")}</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t("bioPlaceholder")}
            rows={3}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t("website")}</label>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={updateProfile.isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {updateProfile.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {t("saveAndContinue")}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onNext}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {t("skipStep")}
      </button>
    </form>
  );
}

// ── Step 2: Stripe Connect ───────────────────────────────────────

function StripeStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const t = useTranslations("publisherSetup");
  const tCommon = useTranslations("common");

  const { data: connectStatus, isLoading } = trpc.user.getStripeConnectStatus.useQuery(
    undefined,
    { refetchInterval: 5000 }
  );

  const createLink = trpc.user.createConnectOnboardingLink.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const isConnected = connectStatus?.connected && connectStatus?.complete;
  const isIncomplete = connectStatus?.connected && !connectStatus?.complete;

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">{t("stripeTitle")}</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">{t("stripeDescription")}</p>
      </div>

      {/* Revenue visual */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-center">
          <p className="text-3xl font-bold text-primary">70%</p>
          <p className="text-xs text-muted-foreground mt-1">{t("youKeep")}</p>
        </div>
        <div className="p-4 rounded-xl bg-background border border-border text-center">
          <p className="text-3xl font-bold text-foreground">30%</p>
          <p className="text-xs text-muted-foreground mt-1">{t("platformKeeps")}</p>
        </div>
      </div>

      {/* Why this matters callout */}
      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
        <p className="text-sm font-medium text-foreground mb-1">{t("whyStripeMatters")}</p>
        <p className="text-xs text-muted-foreground">{t("whyStripeExplainer")}</p>
      </div>

      {isConnected ? (
        <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{t("stripeConnected")}</p>
            <p className="text-xs text-muted-foreground">{t("stripeConnectedHint")}</p>
          </div>
        </div>
      ) : isIncomplete ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("stripeIncomplete")}</p>
              <p className="text-xs text-muted-foreground">{t("stripeIncompleteHint")}</p>
            </div>
          </div>
          <button
            onClick={() => createLink.mutate()}
            disabled={createLink.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {createLink.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("completeStripeSetup")}
          </button>
        </div>
      ) : connectStatus?.available ? (
        <button
          onClick={() => createLink.mutate()}
          disabled={createLink.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {createLink.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("connecting")}
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              {t("connectStripe")}
            </>
          )}
        </button>
      ) : (
        <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
          <p className="text-sm text-muted-foreground">{t("stripeUnavailable")}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {tCommon("back")}
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {isConnected ? t("continue") : t("skipStep")}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Step 3: AI Provider ──────────────────────────────────────────

function AIProviderStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const t = useTranslations("publisherSetup");
  const tCommon = useTranslations("common");
  const [showProForm, setShowProForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("ANTHROPIC");
  const [apiKey, setApiKey] = useState("");

  const { data: status } = trpc.settings.getAIProviderStatus.useQuery();
  const { data: providerOpts } = trpc.settings.getProviderOptions.useQuery();
  const utils = trpc.useUtils();

  const saveProvider = trpc.settings.saveAIProvider.useMutation({
    onSuccess: () => {
      toast.success(t("apiKeySaved"));
      utils.settings.getAIProviderStatus.invalidate();
      utils.settings.getApiKeyStatus.invalidate();
      onNext();
    },
    onError: (error) => toast.error(error.message),
  });

  const providers = providerOpts?.providers ?? [];
  const currentProviderDef = providers.find((p) => p.value === selectedProvider);
  const isConfigured = status?.hasApiKey || status?.isPrivileged;

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
    <div className="space-y-6">
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Cpu className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">{t("aiProviderTitle")}</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">{t("aiProviderDescription")}</p>
      </div>

      {/* What does it do? */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <p className="text-sm font-medium text-foreground mb-1">{t("whatApiKeyDoes")}</p>
        <p className="text-xs text-muted-foreground">{t("apiKeyExplainer")}</p>
      </div>

      {isConfigured ? (
        <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{t("apiKeyConfigured")}</p>
            <p className="text-xs text-muted-foreground">
              {status?.isPrivileged ? t("platformKeyActive") : status?.providerLabel}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Community option — primary CTA */}
          {status?.communityAvailable && (
            <button
              type="button"
              onClick={handleCommunity}
              disabled={saveProvider.isPending}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-green-500/40 bg-green-500/5 hover:border-green-500 transition-all text-left"
            >
              <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{t("communityOption")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("communityOptionDescription")}</p>
              </div>
              {saveProvider.isPending && <Loader2 className="w-4 h-4 animate-spin text-green-500" />}
            </button>
          )}

          {/* Pro option — expandable */}
          {!showProForm ? (
            <button
              type="button"
              onClick={() => setShowProForm(true)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/40 transition-all text-left"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t("bringKeyOption")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("apiKeyExplainer").slice(0, 80)}...</p>
              </div>
            </button>
          ) : (
            <form onSubmit={handleProSubmit} className="space-y-4 p-4 rounded-xl border-2 border-primary/40 bg-primary/5">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("apiKeyLabel")}</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    setSelectedProvider(e.target.value);
                    setApiKey("");
                  }}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 mb-3"
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
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1.5">{t("apiKeyEncrypted")}</p>
              </div>

              <button
                type="submit"
                disabled={!apiKey.trim() || saveProvider.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saveProvider.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("saveApiKey")}
              </button>

              {currentProviderDef?.keyUrl && (
                <a
                  href={currentProviderDef.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-sm text-primary hover:underline"
                >
                  {t("getApiKey")}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </form>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {tCommon("back")}
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {isConfigured ? t("continue") : t("skipStep")}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Ready ────────────────────────────────────────────────

function ReadyStep() {
  const t = useTranslations("publisherSetup");
  const router = useRouter();

  const { data: profile } = trpc.user.getPublisherProfile.useQuery();
  const { data: stripeStatus } = trpc.user.getStripeConnectStatus.useQuery();
  const { data: apiKeyStatus } = trpc.settings.getApiKeyStatus.useQuery();

  const hasProfile = !!(profile?.firmName || profile?.specialties?.length);
  const hasStripe = stripeStatus?.connected && stripeStatus?.complete;
  const hasApiKey = apiKeyStatus?.hasApiKey || apiKeyStatus?.isPrivileged;

  const items = [
    { label: t("checkProfile"), done: hasProfile },
    { label: t("checkStripe"), done: hasStripe },
    { label: t("checkApiKey"), done: hasApiKey },
  ];

  const allDone = items.every((i) => i.done);

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Rocket className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          {allDone ? t("readyTitle") : t("almostReadyTitle")}
        </h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          {allDone ? t("readyDescription") : t("almostReadyDescription")}
        </p>
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-3 p-4 rounded-xl border ${
              item.done
                ? "bg-green-500/5 border-green-500/20"
                : "bg-amber-500/5 border-amber-500/20"
            }`}
          >
            {item.done ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            )}
            <p className={`text-sm ${item.done ? "text-foreground" : "text-muted-foreground"}`}>
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="space-y-3 pt-2">
        {hasApiKey ? (
          <button
            onClick={() => router.push("/documents/new")}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            {t("uploadFirstContract")}
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => router.push("/documents")}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            {t("goToDashboard")}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => router.push("/settings")}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("goToSettings")}
        </button>
      </div>
    </div>
  );
}

