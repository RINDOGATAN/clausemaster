"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const t = useTranslations("auth");

  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "Access denied. You do not have permission to sign in.",
    Verification: "The verification link has expired or has already been used.",
    Default: "An unexpected error occurred during sign in.",
    // E-mail policy refusal (Google sign-in with a blocked address).
    EmailNotAccepted: t("emailNotAccepted"),
  };

  const message = errorMessages[error || "Default"] || errorMessages.Default;

  return (
    <div className="w-full max-w-md">
      <div className="card-brutal text-center">
        <div className="w-16 h-16 bg-destructive/20 flex items-center justify-center mx-auto mb-6 rounded-full">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
        <p className="text-muted-foreground mb-6">{message}</p>
        <Link
          href="/sign-in"
          className="btn-brutal inline-flex items-center gap-2"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-muted-foreground">Loading...</div></div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
