"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, FileCheck, Users, Layers, Ticket } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function AdminDashboardPage() {
  const t = useTranslations("admin");
  const { data: stats, isLoading } = trpc.admin.getStats.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    {
      label: t("pendingSubmissions"),
      value: stats?.pendingSubmissions ?? 0,
      icon: FileCheck,
      href: "/admin/submissions",
      highlight: (stats?.pendingSubmissions ?? 0) > 0,
    },
    {
      label: t("totalPublishers"),
      value: stats?.totalPublishers ?? 0,
      icon: Users,
      href: null,
    },
    {
      label: t("totalSkillsPublished"),
      value: stats?.totalSkillsPublished ?? 0,
      icon: Layers,
      href: null,
    },
    {
      label: t("activeInvites"),
      value: stats?.totalInvites ?? 0,
      icon: Ticket,
      href: "/admin/invites",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const content = (
            <div
              className={`card-brutal p-5 space-y-2 ${card.highlight ? "border-primary/50" : ""} ${card.href ? "hover:border-primary/50 transition-colors" : ""}`}
            >
              <div className="flex items-center justify-between">
                <Icon className="w-5 h-5 text-muted-foreground" />
                {card.highlight && (
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}
              </div>
              <p className="text-3xl font-bold">{card.value}</p>
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </div>
          );
          return card.href ? (
            <Link key={card.label} href={card.href}>{content}</Link>
          ) : (
            <div key={card.label}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
