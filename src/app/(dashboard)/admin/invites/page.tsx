"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Plus, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminInvitesPage() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const utils = trpc.useUtils();

  const { data: invites, isLoading } = trpc.admin.listInvites.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState("");

  const createMutation = trpc.admin.createInvite.useMutation({
    onSuccess: () => {
      toast.success(t("inviteCreated"));
      setShowCreate(false);
      setCode("");
      setLabel("");
      setMaxUses("");
      utils.admin.listInvites.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deactivateMutation = trpc.admin.deactivateInvite.useMutation({
    onSuccess: () => {
      toast.success(t("inviteDeactivated"));
      utils.admin.listInvites.invalidate();
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    createMutation.mutate({
      code: code.trim(),
      label: label.trim() || undefined,
      maxUses: maxUses ? parseInt(maxUses, 10) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t("inviteCodes")}</h1>
            <p className="text-muted-foreground text-sm">{t("inviteCodesSubtitle")}</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-brutal text-sm px-4 py-2 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("createInvite")}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="card-brutal p-5 space-y-4">
          <h3 className="section-label">{t("newInvite")}</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t("inviteCodeLabel")}</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="FIRM-ABC-2026"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("inviteLabelField")}</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Law Firm ABC batch"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("maxUses")}</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                min={1}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!code.trim() || createMutation.isPending}
              className="btn-brutal text-sm px-4 py-2 inline-flex items-center gap-2"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("createInvite")}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
            >
              {tCommon("cancel")}
            </button>
          </div>
        </form>
      )}

      {/* Invites list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !invites || invites.length === 0 ? (
        <div className="card-brutal text-center py-12">
          <p className="text-muted-foreground">{t("noInvites")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className={`card-brutal p-4 flex items-center gap-4 ${!invite.active ? "opacity-50" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-sm font-mono text-primary">{invite.code}</code>
                  {!invite.active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
                      {t("inactive")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {invite.label || "—"} &middot;{" "}
                  {t("usageCount", {
                    used: invite.usedCount,
                    max: invite.maxUses ?? "∞",
                  })} &middot;{" "}
                  {new Date(invite.createdAt).toLocaleDateString()}
                  {invite.expiresAt && (
                    <> &middot; {t("expiresOn", { date: new Date(invite.expiresAt).toLocaleDateString() })}</>
                  )}
                </p>
              </div>
              {invite.active && (
                <button
                  onClick={() => deactivateMutation.mutate({ id: invite.id })}
                  disabled={deactivateMutation.isPending}
                  className="text-sm text-muted-foreground hover:text-red-500 transition-colors p-2"
                  title={t("deactivate")}
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
