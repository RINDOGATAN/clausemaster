"use client";

import { useState, useEffect, useCallback } from "react";
import { FileSearch, Blocks, Store, Globe, FileText, ClipboardCheck, Shield } from "lucide-react";
import LandingHeader from "../LandingHeader";
import LandingContentV2 from "./LandingContentV2";
import LandingFooter from "../LandingFooter";

import en from "./i18n/en.json";
import es from "./i18n/es.json";
import authEn from "../i18n/auth-en.json";
import authEs from "../i18n/auth-es.json";

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

export default function LandingPageV2() {
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
      id: "analysis",
      icon: FileSearch,
      title: t("feat.analysis.title"),
      headline: t("feat.analysis.headline"),
      description: t("feat.analysis.desc"),
      highlights: [t("feat.analysis.h1"), t("feat.analysis.h2"), t("feat.analysis.h3"), t("feat.analysis.h4")],
    },
    {
      id: "skill",
      icon: Blocks,
      title: t("feat.skill.title"),
      headline: t("feat.skill.headline"),
      description: t("feat.skill.desc"),
      highlights: [t("feat.skill.h1"), t("feat.skill.h2"), t("feat.skill.h3"), t("feat.skill.h4")],
    },
    {
      id: "marketplace",
      icon: Store,
      title: t("feat.marketplace.title"),
      headline: t("feat.marketplace.headline"),
      description: t("feat.marketplace.desc"),
      highlights: [t("feat.marketplace.h1"), t("feat.marketplace.h2"), t("feat.marketplace.h3"), t("feat.marketplace.h4")],
    },
    {
      id: "deploy",
      icon: Globe,
      title: t("feat.deploy.title"),
      headline: t("feat.deploy.headline"),
      description: t("feat.deploy.desc"),
      highlights: [t("feat.deploy.h1"), t("feat.deploy.h2"), t("feat.deploy.h3"), t("feat.deploy.h4")],
    },
  ];

  const workflowSteps = [1, 2, 3, 4, 5].map((n) => ({
    title: t(`workflow.s${n}.title`),
    desc: t(`workflow.s${n}.desc`),
  }));

  const valueProps = [1, 2, 3, 4].map((n) => ({
    title: t(`value.v${n}.title`),
    desc: t(`value.v${n}.desc`),
  }));

  const socialProofs = [t("social.s1"), t("social.s2"), t("social.s3")];

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

  // Reuse the v1 header/footer translations merged into the lite dict
  const headerFooterT = (key: string) => {
    const map: Record<string, string> = {
      "header.badge": "Clausemaster",
      "header.cta": locale === "es" ? "Iniciar sesi\u00f3n" : "Sign In",
      "footer.tagline": locale === "es" ? "Constructor de skills legales" : "Legal skill builder",
      "footer.privacy": locale === "es" ? "Privacidad" : "Privacy",
      "footer.terms": locale === "es" ? "T\u00e9rminos" : "Terms",
      "footer.marketplace": locale === "es" ? "Marketplace TODO.LAW" : "TODO.LAW Marketplace",
    };
    return map[key] ?? key;
  };

  return (
    <>
      <LandingHeader
        t={headerFooterT}
        locale={locale}
        onLocaleToggle={toggleLocale}
      />
      <LandingContentV2
        t={t}
        tAuth={tAuth}
        features={features}
        workflowSteps={workflowSteps}
        valueProps={valueProps}
        skillTypes={skillTypes}
        socialProofs={socialProofs}
        heroVideo="/hero-clausemaster-v2-bg.mp4"
        callbackUrl="/documents"
      />
      <LandingFooter t={headerFooterT} />
    </>
  );
}
