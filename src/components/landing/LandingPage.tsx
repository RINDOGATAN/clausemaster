"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, Layers, Users, Globe, FileText, Shield, ClipboardCheck } from "lucide-react";
import LandingHeader from "./LandingHeader";
import LandingContent from "./LandingContent";
import LandingFooter from "./LandingFooter";

import en from "./i18n/en.json";
import es from "./i18n/es.json";
import authEn from "./i18n/auth-en.json";
import authEs from "./i18n/auth-es.json";

function detectLocale(): "en" | "es" {
  if (typeof window === "undefined") return "en";
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang");
  if (lang === "es" || lang === "en") return lang;
  const match = document.cookie.match(/(?:^|; )locale=([^;]*)/);
  if (match?.[1] === "es") return "es";
  return "en";
}

function setLocaleCookie(locale: string) {
  const maxAge = 365 * 24 * 60 * 60;
  const domain = window.location.hostname.endsWith(".todo.law") ? ";domain=.todo.law" : "";
  document.cookie = `locale=${locale};path=/;max-age=${maxAge};SameSite=Lax${domain}`;
}

export default function LandingPage() {
  const [locale, setLocale] = useState<"en" | "es">("en");

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale((prev) => {
      const next = prev === "en" ? "es" : "en";
      setLocaleCookie(next);
      return next;
    });
  }, []);

  const dict = locale === "es" ? es : en;
  const authDict = locale === "es" ? authEs : authEn;
  const t = (key: string) => (dict as Record<string, string>)[key] ?? key;
  const tAuth = (key: string) => (authDict as Record<string, string>)[key] ?? key;

  const features = [
    {
      id: "ai",
      icon: Brain,
      title: t("feat.ai.title"),
      headline: t("feat.ai.headline"),
      description: t("feat.ai.desc"),
      highlights: [t("feat.ai.h1"), t("feat.ai.h2"), t("feat.ai.h3"), t("feat.ai.h4")],
    },
    {
      id: "multi",
      icon: Layers,
      title: t("feat.multi.title"),
      headline: t("feat.multi.headline"),
      description: t("feat.multi.desc"),
      highlights: [t("feat.multi.h1"), t("feat.multi.h2"), t("feat.multi.h3"), t("feat.multi.h4")],
    },
    {
      id: "party",
      icon: Users,
      title: t("feat.party.title"),
      headline: t("feat.party.headline"),
      description: t("feat.party.desc"),
      highlights: [t("feat.party.h1"), t("feat.party.h2"), t("feat.party.h3"), t("feat.party.h4")],
    },
    {
      id: "juris",
      icon: Globe,
      title: t("feat.juris.title"),
      headline: t("feat.juris.headline"),
      description: t("feat.juris.desc"),
      highlights: [t("feat.juris.h1"), t("feat.juris.h2"), t("feat.juris.h3"), t("feat.juris.h4")],
    },
  ];

  const workflowSteps = [1, 2, 3, 4, 5, 6].map((n) => ({
    title: t(`workflow.s${n}.title`),
    desc: t(`workflow.s${n}.desc`),
  }));

  const valueProps = [1, 2, 3, 4].map((n) => ({
    title: t(`value.v${n}.title`),
    desc: t(`value.v${n}.desc`),
  }));

  const skillTypes = [
    {
      title: t("skills.contract.title"),
      desc: t("skills.contract.desc"),
      examples: t("skills.contract.examples"),
      icon: FileText,
    },
    {
      title: t("skills.assessment.title"),
      desc: t("skills.assessment.desc"),
      examples: t("skills.assessment.examples"),
      icon: ClipboardCheck,
    },
    {
      title: t("skills.solo.title"),
      desc: t("skills.solo.desc"),
      examples: t("skills.solo.examples"),
      icon: Shield,
    },
  ];

  return (
    <>
      <LandingHeader
        t={t}
        locale={locale}
        onLocaleToggle={toggleLocale}
      />
      <LandingContent
        t={t}
        tAuth={tAuth}
        features={features}
        workflowSteps={workflowSteps}
        valueProps={valueProps}
        skillTypes={skillTypes}
        heroVideo="/hero-clausemaster-v2-bg.mp4"
        callbackUrl="/documents"
      />
      <LandingFooter t={t} />
    </>
  );
}
