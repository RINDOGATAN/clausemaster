"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Check,
  Save,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Tab = "clauses" | "boilerplate" | "metadata";

// Type helpers for JSON data
interface ClauseOption {
  id: string;
  code: string;
  label: Record<string, string>;
  order: number;
  plainDescription: Record<string, string>;
  prosPartyA: Record<string, string[]>;
  consPartyA: Record<string, string[]>;
  prosPartyB: Record<string, string[]>;
  consPartyB: Record<string, string[]>;
  legalText: Record<string, string>;
  biasPartyA: number;
  biasPartyB: number;
}

interface Clause {
  id: string;
  title: Record<string, string>;
  category: string;
  order: number;
  plainDescription: Record<string, string>;
  legalContext?: Record<string, string>;
  isRequired: boolean;
  options: ClauseOption[];
}

interface ClausesJson {
  contractType: string;
  displayName: Record<string, string>;
  description: Record<string, string>;
  version: string;
  clauses: Clause[];
}

interface BoilerplateJson {
  contractTitle: string;
  preamble: string;
  background: string;
  definitions: { term: string; definition: string }[];
  standardClauses: { title: string; text: string }[];
  generalProvisions: { title: string; text: string }[];
  jurisdictionProvisions?: Record<string, { title: string; text: string }>;
  signatureBlock: string;
  partyLabels: { partyA: string; partyB: string };
}

interface MetadataJson {
  contractType: string;
  displayName: string;
  description: string;
  version: string;
  clauseCount: number;
}

interface ManifestJson {
  skillId: string;
  name: string;
  displayName: string;
  version: string;
  jurisdictions: string[];
  languages: string[];
  author: string;
  license: string;
  templateFamily: string;
  nativeJurisdiction: string;
}

// Helper to get localized text from i18n object
function localized(obj: Record<string, string> | string | undefined): string {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj.en || obj.es || Object.values(obj)[0] || "";
}

function localizedArray(obj: Record<string, string[]> | string[] | undefined): string[] {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  return obj.en || obj.es || Object.values(obj)[0] || [];
}

export default function SkillDraftPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("skillDraft");
  const documentId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>("clauses");
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());

  // First get the document to find the analysisId
  const { data: document, isLoading: docLoading } = trpc.document.getById.useQuery(
    { id: documentId }
  );

  const analysisId = document?.analysis?.id;

  const { data: draft, isLoading: draftLoading, refetch } = trpc.skillDraft.get.useQuery(
    { analysisId: analysisId! },
    {
      enabled: !!analysisId,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (status === "REVIEW" || status === "EXPORTED" || status === "FAILED") return false;
        return 2000;
      },
    }
  );

  const exportMutation = trpc.skillDraft.export.useMutation({
    onSuccess: (data) => {
      toast.success(t("export.exportedTo", { path: data.exportPath }));
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const regenerateMutation = trpc.skillDraft.regenerate.useMutation({
    onSuccess: () => {
      toast.success(t("regenerating"));
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateClausesMutation = trpc.skillDraft.updateClauses.useMutation({
    onSuccess: () => {
      toast.success(t("saved"));
      refetch();
    },
  });

  const updateBoilerplateMutation = trpc.skillDraft.updateBoilerplate.useMutation({
    onSuccess: () => {
      toast.success(t("saved"));
      refetch();
    },
  });

  const updateMetadataMutation = trpc.skillDraft.updateMetadata.useMutation({
    onSuccess: () => {
      toast.success(t("saved"));
      refetch();
    },
  });

  const isLoading = docLoading || draftLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">Skill draft not found</p>
        <Link href={`/documents/${documentId}`} className="text-primary hover:underline mt-4 inline-block">
          Back to document
        </Link>
      </div>
    );
  }

  // Generating state
  if (draft.status === "GENERATING") {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <Link
          href={`/documents/${documentId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to document
        </Link>
        <div className="card-brutal text-center py-16">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{t("generatingSkill")}</h2>
          <p className="text-muted-foreground">This may take a few minutes...</p>
        </div>
      </div>
    );
  }

  // Failed state
  if (draft.status === "FAILED") {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <Link
          href={`/documents/${documentId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to document
        </Link>
        <div className="card-brutal text-center py-12">
          <h2 className="text-xl font-bold text-destructive mb-2">{t("generationFailed")}</h2>
          <p className="text-muted-foreground mb-6">{draft.errorMessage || "Unknown error"}</p>
          <button
            onClick={() => analysisId && regenerateMutation.mutate({ analysisId })}
            disabled={regenerateMutation.isPending}
            className="btn-brutal inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${regenerateMutation.isPending ? "animate-spin" : ""}`} />
            {t("retryGeneration")}
          </button>
        </div>
      </div>
    );
  }

  const clausesJson = draft.clausesJson as ClausesJson | null;
  const boilerplateJson = draft.boilerplateJson as BoilerplateJson | null;
  const metadataJson = draft.metadataJson as MetadataJson | null;
  const manifestJson = draft.manifestJson as ManifestJson | null;

  const toggleClause = (clauseId: string) => {
    setExpandedClauses((prev) => {
      const next = new Set(prev);
      if (next.has(clauseId)) next.delete(clauseId);
      else next.add(clauseId);
      return next;
    });
  };

  const toggleOption = (optionKey: string) => {
    setExpandedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(optionKey)) next.delete(optionKey);
      else next.add(optionKey);
      return next;
    });
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "clauses", label: t("tabs.clauses") },
    { id: "boilerplate", label: t("tabs.boilerplate") },
    { id: "metadata", label: t("tabs.metadata") },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/documents/${documentId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{draft.displayName || "Skill Draft"}</h1>
            <p className="text-sm text-muted-foreground">{t("reviewDescription")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status badge */}
          <span className={`tag ${draft.status === "EXPORTED" ? "tag-accent" : ""}`}>
            {t(`status.${draft.status}`)}
          </span>
          {draft.status === "EXPORTED" && draft.exportPath && (
            <span className="text-xs text-muted-foreground">{draft.exportPath}</span>
          )}
          {/* Contract type badge */}
          {draft.contractType && (
            <span className="tag-accent">{draft.contractType}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-brutal ${activeTab === tab.id ? "tab-brutal-active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[500px]">
        {activeTab === "clauses" && clausesJson && (
          <ClausesTab
            clausesJson={clausesJson}
            draftId={draft.id}
            updateMutation={updateClausesMutation}
            expandedClauses={expandedClauses}
            expandedOptions={expandedOptions}
            toggleClause={toggleClause}
            toggleOption={toggleOption}
            t={t}
          />
        )}
        {activeTab === "boilerplate" && boilerplateJson && (
          <BoilerplateTab
            boilerplateJson={boilerplateJson}
            draftId={draft.id}
            updateMutation={updateBoilerplateMutation}
            t={t}
          />
        )}
        {activeTab === "metadata" && metadataJson && manifestJson && (
          <MetadataTab
            metadataJson={metadataJson}
            manifestJson={manifestJson}
            draft={draft}
            draftId={draft.id}
            updateMutation={updateMetadataMutation}
            t={t}
          />
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          onClick={() => analysisId && regenerateMutation.mutate({ analysisId })}
          disabled={regenerateMutation.isPending}
          className="btn-brutal-outline text-sm px-4 py-2 inline-flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${regenerateMutation.isPending ? "animate-spin" : ""}`} />
          {regenerateMutation.isPending ? t("regenerating") : t("regenerate")}
        </button>
        <button
          onClick={() => exportMutation.mutate({ skillDraftId: draft.id })}
          disabled={exportMutation.isPending || draft.status === "EXPORTED"}
          className="btn-brutal inline-flex items-center gap-2"
        >
          {exportMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : draft.status === "EXPORTED" ? (
            <Check className="w-4 h-4" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {exportMutation.isPending
            ? t("export.exporting")
            : draft.status === "EXPORTED"
            ? t("export.exported")
            : t("export.exportToDealRoom")}
        </button>
      </div>
    </div>
  );
}

// ---------- Clauses Tab ----------

function BiasBar({ value }: { value: number }) {
  // value: -1 to 1, 0 = center
  const pct = ((value + 1) / 2) * 100;
  return (
    <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden">
      <div
        className="absolute top-0 h-full bg-primary rounded-full"
        style={{ left: `${Math.min(pct, 50)}%`, width: `${Math.abs(pct - 50)}%` }}
      />
      <div className="absolute top-0 left-1/2 w-px h-full bg-muted-foreground/40" />
    </div>
  );
}

function ClausesTab({
  clausesJson,
  draftId,
  updateMutation,
  expandedClauses,
  expandedOptions,
  toggleClause,
  toggleOption,
  t,
}: {
  clausesJson: ClausesJson;
  draftId: string;
  updateMutation: ReturnType<typeof trpc.skillDraft.updateClauses.useMutation>;
  expandedClauses: Set<string>;
  expandedOptions: Set<string>;
  toggleClause: (id: string) => void;
  toggleOption: (key: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {clausesJson.clauses.length} {t("tabs.clauses").toLowerCase()}
        </p>
      </div>

      {clausesJson.clauses.map((clause) => {
        const isExpanded = expandedClauses.has(clause.id);
        return (
          <div key={clause.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Clause header */}
            <button
              onClick={() => toggleClause(clause.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span className="metric text-sm text-muted-foreground w-8">{clause.order}</span>
              <span className="font-semibold flex-1">{localized(clause.title)}</span>
              <span className="tag text-xs">{clause.category}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${clause.isRequired ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                {clause.isRequired ? t("clauses.required") : t("clauses.optional")}
              </span>
              <span className="text-xs text-muted-foreground">{clause.options.length} {t("clauses.options").toLowerCase()}</span>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-border px-4 py-4 space-y-4">
                {/* Description */}
                <p className="text-sm text-muted-foreground">{localized(clause.plainDescription)}</p>
                {clause.legalContext && (
                  <p className="text-xs text-muted-foreground italic">{localized(clause.legalContext)}</p>
                )}

                {/* Options */}
                <div className="space-y-2">
                  {clause.options.map((option) => {
                    const optKey = `${clause.id}:${option.id}`;
                    const isOptExpanded = expandedOptions.has(optKey);
                    return (
                      <div key={option.id} className="bg-secondary/30 border border-border rounded-xl overflow-hidden">
                        <button
                          onClick={() => toggleOption(optKey)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-secondary/50 transition-colors"
                        >
                          {isOptExpanded ? (
                            <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-sm font-medium flex-1">{localized(option.label)}</span>
                          <div className="flex items-center gap-2 w-48">
                            <span className="text-xs text-muted-foreground w-6 text-right">A</span>
                            <div className="flex-1">
                              <BiasBar value={option.biasPartyA} />
                            </div>
                            <span className="text-xs font-mono w-10 text-right">{option.biasPartyA.toFixed(1)}</span>
                          </div>
                        </button>

                        {isOptExpanded && (
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <p className="text-sm text-muted-foreground">{localized(option.plainDescription)}</p>

                            {/* Pros/Cons grid */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="section-label mb-1">{t("clauses.prosPartyA")}</p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                  {localizedArray(option.prosPartyA).map((pro, i) => (
                                    <li key={i} className="flex gap-1">
                                      <span className="text-green-500 shrink-0">+</span>
                                      {pro}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="section-label mb-1">{t("clauses.consPartyA")}</p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                  {localizedArray(option.consPartyA).map((con, i) => (
                                    <li key={i} className="flex gap-1">
                                      <span className="text-red-500 shrink-0">-</span>
                                      {con}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="section-label mb-1">{t("clauses.prosPartyB")}</p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                  {localizedArray(option.prosPartyB).map((pro, i) => (
                                    <li key={i} className="flex gap-1">
                                      <span className="text-green-500 shrink-0">+</span>
                                      {pro}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="section-label mb-1">{t("clauses.consPartyB")}</p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                  {localizedArray(option.consPartyB).map((con, i) => (
                                    <li key={i} className="flex gap-1">
                                      <span className="text-red-500 shrink-0">-</span>
                                      {con}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Bias scores */}
                            <div className="flex gap-6 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{t("clauses.biasPartyA")}:</span>
                                <span className="font-mono">{option.biasPartyA.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{t("clauses.biasPartyB")}:</span>
                                <span className="font-mono">{option.biasPartyB.toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Legal text */}
                            <div>
                              <p className="section-label mb-1">{t("clauses.legalText")}</p>
                              <div className="bg-background/50 border border-border rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {localized(option.legalText)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Boilerplate Tab ----------

function BoilerplateTab({
  boilerplateJson,
  draftId,
  updateMutation,
  t,
}: {
  boilerplateJson: BoilerplateJson;
  draftId: string;
  updateMutation: ReturnType<typeof trpc.skillDraft.updateBoilerplate.useMutation>;
  t: ReturnType<typeof useTranslations>;
}) {
  const [editing, setEditing] = useState<Record<string, string>>({});

  const handleSave = (field: string, value: string) => {
    const updated = { ...boilerplateJson, [field]: value };
    updateMutation.mutate({ skillDraftId: draftId, boilerplateJson: updated });
    setEditing((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Contract Title */}
      <Section title={t("boilerplate.contractTitle")}>
        <EditableText
          value={editing.contractTitle ?? boilerplateJson.contractTitle}
          onChange={(v) => setEditing((prev) => ({ ...prev, contractTitle: v }))}
          onSave={() => handleSave("contractTitle", editing.contractTitle ?? boilerplateJson.contractTitle)}
          isEditing={editing.contractTitle !== undefined}
          onStartEdit={() => setEditing((prev) => ({ ...prev, contractTitle: boilerplateJson.contractTitle }))}
        />
      </Section>

      {/* Party Labels */}
      <Section title={t("boilerplate.partyLabels")}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="section-label mb-1">{t("boilerplate.partyA")}</p>
            <p className="text-sm">{boilerplateJson.partyLabels.partyA}</p>
          </div>
          <div>
            <p className="section-label mb-1">{t("boilerplate.partyB")}</p>
            <p className="text-sm">{boilerplateJson.partyLabels.partyB}</p>
          </div>
        </div>
      </Section>

      {/* Preamble */}
      <Section title={t("boilerplate.preamble")}>
        <EditableText
          value={editing.preamble ?? boilerplateJson.preamble}
          onChange={(v) => setEditing((prev) => ({ ...prev, preamble: v }))}
          onSave={() => handleSave("preamble", editing.preamble ?? boilerplateJson.preamble)}
          isEditing={editing.preamble !== undefined}
          onStartEdit={() => setEditing((prev) => ({ ...prev, preamble: boilerplateJson.preamble }))}
          multiline
        />
      </Section>

      {/* Background */}
      <Section title={t("boilerplate.background")}>
        <EditableText
          value={editing.background ?? boilerplateJson.background}
          onChange={(v) => setEditing((prev) => ({ ...prev, background: v }))}
          onSave={() => handleSave("background", editing.background ?? boilerplateJson.background)}
          isEditing={editing.background !== undefined}
          onStartEdit={() => setEditing((prev) => ({ ...prev, background: boilerplateJson.background }))}
          multiline
        />
      </Section>

      {/* Definitions */}
      <Section title={t("boilerplate.definitions")}>
        <div className="space-y-2">
          {boilerplateJson.definitions.map((def, i) => (
            <div key={i} className="bg-secondary/30 border border-border rounded-xl px-3 py-2">
              <span className="font-semibold text-sm text-primary">&ldquo;{def.term}&rdquo;</span>
              <span className="text-sm text-muted-foreground ml-2">{def.definition}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Standard Clauses */}
      <Section title={t("boilerplate.standardClauses")}>
        <div className="space-y-3">
          {boilerplateJson.standardClauses.map((clause, i) => (
            <div key={i} className="bg-secondary/30 border border-border rounded-xl px-4 py-3">
              <p className="font-semibold text-sm mb-1">{clause.title}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{clause.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* General Provisions */}
      <Section title={t("boilerplate.generalProvisions")}>
        <div className="space-y-3">
          {boilerplateJson.generalProvisions.map((prov, i) => (
            <div key={i} className="bg-secondary/30 border border-border rounded-xl px-4 py-3">
              <p className="font-semibold text-sm mb-1">{prov.title}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{prov.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Jurisdiction Provisions */}
      {boilerplateJson.jurisdictionProvisions && Object.keys(boilerplateJson.jurisdictionProvisions).length > 0 && (
        <Section title={t("boilerplate.jurisdictionProvisions")}>
          <div className="space-y-3">
            {Object.entries(boilerplateJson.jurisdictionProvisions).map(([key, prov]) => (
              <div key={key} className="bg-secondary/30 border border-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="tag text-xs">{key}</span>
                  <p className="font-semibold text-sm">{prov.title}</p>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{prov.text}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Signature Block */}
      <Section title={t("boilerplate.signatureBlock")}>
        <div className="bg-background/50 border border-border rounded-lg p-3 text-sm font-mono whitespace-pre-wrap">
          {boilerplateJson.signatureBlock}
        </div>
      </Section>
    </div>
  );
}

// ---------- Metadata Tab ----------

function MetadataTab({
  metadataJson,
  manifestJson,
  draft,
  draftId,
  updateMutation,
  t,
}: {
  metadataJson: MetadataJson;
  manifestJson: ManifestJson;
  draft: { aiProvider: string | null; aiModel: string | null; processingTimeMs: number | null };
  draftId: string;
  updateMutation: ReturnType<typeof trpc.skillDraft.updateMetadata.useMutation>;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Manifest info */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h3 className="section-label">Manifest</h3>
        <MetaField label={t("metadata.skillId")} value={manifestJson.skillId} />
        <MetaField label={t("metadata.displayName")} value={manifestJson.displayName} />
        <MetaField label={t("metadata.contractType")} value={manifestJson.name} />
        <MetaField label={t("metadata.version")} value={manifestJson.version} />
        <MetaField label={t("metadata.templateFamily")} value={manifestJson.templateFamily} />
        <MetaField label={t("metadata.author")} value={manifestJson.author} />
        <MetaField label={t("metadata.jurisdictions")} value={manifestJson.jurisdictions.join(", ")} />
        <MetaField label={t("metadata.languages")} value={manifestJson.languages.join(", ")} />
      </div>

      {/* Metadata info */}
      <div className="space-y-6">
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="section-label">Metadata</h3>
          <MetaField label={t("metadata.contractType")} value={metadataJson.contractType} />
          <MetaField label={t("metadata.displayName")} value={metadataJson.displayName} />
          <MetaField label={t("metadata.version")} value={metadataJson.version} />
          <MetaField label={t("metadata.clauseCount")} value={String(metadataJson.clauseCount)} />
        </div>

        {/* AI Info */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="section-label">AI Generation</h3>
          {draft.aiProvider && <MetaField label={t("aiProvider")} value={draft.aiProvider} />}
          {draft.aiModel && <MetaField label={t("aiModel")} value={draft.aiModel} />}
          {draft.processingTimeMs && (
            <MetaField label={t("processingTime")} value={`${(draft.processingTimeMs / 1000).toFixed(1)}s`} />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Shared Components ----------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="section-label mb-4">{title}</h3>
      {children}
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}:</span>
      <span className="text-sm font-mono">{value}</span>
    </div>
  );
}

function EditableText({
  value,
  onChange,
  onSave,
  isEditing,
  onStartEdit,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  multiline?: boolean;
}) {
  if (isEditing) {
    return (
      <div className="space-y-2">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={6}
            className="input-brutal w-full text-sm font-mono"
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input-brutal w-full text-sm"
          />
        )}
        <button onClick={onSave} className="btn-brutal text-xs px-3 py-1.5 inline-flex items-center gap-1">
          <Save className="w-3 h-3" />
          Save
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={onStartEdit}
      className="text-sm whitespace-pre-wrap cursor-pointer hover:bg-secondary/30 rounded-lg p-2 -m-2 transition-colors"
      title="Click to edit"
    >
      {value}
    </div>
  );
}
