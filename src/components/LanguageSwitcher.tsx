"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: Locale) => {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  };

  const nextLocale = locale === "en" ? "es" : "en";

  return (
    <button
      onClick={() => switchLocale(nextLocale)}
      disabled={isPending}
      className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      title={`Switch to ${localeNames[nextLocale]}`}
    >
      <Globe className="w-4 h-4" />
      <span className="font-medium">{locale.toUpperCase()}</span>
    </button>
  );
}
