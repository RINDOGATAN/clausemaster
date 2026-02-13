"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2, Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite code gate state
  const [inviteRequired, setInviteRequired] = useState<boolean | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteUnlocked, setInviteUnlocked] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Check if invite gate is active on mount
  useEffect(() => {
    fetch("/api/verify-invite")
      .then((res) => res.json())
      .then((data) => setInviteRequired(data.required))
      .catch(() => setInviteRequired(false));
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setInviteLoading(true);
    setInviteError(null);

    try {
      const res = await fetch("/api/verify-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode }),
      });
      const data = await res.json();

      if (data.valid) {
        setInviteUnlocked(true);
      } else {
        setInviteError(t("invalidInviteCode"));
      }
    } catch {
      setInviteError(t("invalidInviteCode"));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsEmailLoading(true);
    setError(null);

    try {
      const result = await signIn("email", {
        email: email.trim(),
        redirect: false,
        callbackUrl: "/documents",
      });

      if (result?.error) {
        setError(t("failedMagicLink"));
        setIsEmailLoading(false);
      } else {
        setEmailSent(true);
      }
    } catch {
      setError(t("unexpectedError"));
      setIsEmailLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      await signIn("google", {
        callbackUrl: "/documents",
      });
    } catch {
      setError(t("googleSignInFailed"));
      setIsGoogleLoading(false);
    }
  };

  // Loading state while checking invite requirement
  if (inviteRequired === null) {
    return (
      <div className="w-full max-w-md">
        <div className="card-brutal">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  // Invite code gate
  if (inviteRequired && !inviteUnlocked) {
    return (
      <div className="w-full max-w-md">
        <div className="card-brutal">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-white uppercase tracking-wide">Clausemaster</h1>
            <p className="text-muted-foreground mb-4">
              {t.rich("poweredBy", {
                link: () => (
                  <a
                    href="https://todo.law"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    TODO.LAW
                  </a>
                ),
              })}
            </p>
          </div>

          <div className="w-16 h-16 bg-primary/20 flex items-center justify-center mx-auto mb-6 rounded-full">
            <Lock className="w-8 h-8 text-primary" />
          </div>

          <p className="text-center text-muted-foreground mb-6">
            {t("enterInviteCode")}
          </p>

          {inviteError && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500 text-yellow-600 text-sm rounded-xl">
              {inviteError}
            </div>
          )}

          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">{t("inviteCode")}</Label>
              <Input
                id="invite-code"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                autoFocus
                className="bg-background"
              />
            </div>

            <button
              type="submit"
              disabled={inviteLoading || !inviteCode.trim()}
              className="btn-brutal w-full flex items-center justify-center gap-3 py-3 disabled:opacity-50"
            >
              {inviteLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t("verifying")}
                </>
              ) : (
                t("verifyCode")
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="w-full max-w-md">
        <div className="card-brutal">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/20 flex items-center justify-center mx-auto mb-6 rounded-full">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{t("checkEmail")}</h1>
            <p className="text-muted-foreground">
              {t.rich("magicLinkSent", {
                email: () => <strong className="text-foreground">{email}</strong>,
              })}
            </p>
            <button
              onClick={() => {
                setEmailSent(false);
                setIsEmailLoading(false);
              }}
              className="mt-6 text-sm text-primary hover:underline"
            >
              {t("didntReceive")} {t("tryAgain")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="card-brutal">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white uppercase tracking-wide">Clausemaster</h1>
          <p className="text-muted-foreground mb-4">
            {t.rich("poweredBy", {
              link: () => (
                <a
                  href="https://todo.law"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  TODO.LAW
                </a>
              ),
            })}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500 text-yellow-600 text-sm rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("emailAddress")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background"
            />
          </div>

          <button
            type="submit"
            disabled={isEmailLoading || !email.trim()}
            className="btn-brutal w-full flex items-center justify-center gap-3 py-3 disabled:opacity-50"
          >
            {isEmailLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("sending")}
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                {t("continueWithEmail")}
              </>
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            {t("noPasswordNeeded")}
          </p>
        </form>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center mb-4">
            {t("orContinueWith")}
          </p>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 rounded-full"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            <span className="font-medium">
              {isGoogleLoading ? t("signingIn") : t("continueWithGoogle")}
            </span>
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            {t.rich("bySigningIn", {
              termsLink: () => (
                <a href="https://todo.law/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {t("termsOfUse")}
                </a>
              ),
              privacyLink: () => (
                <a href="https://todo.law/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {t("privacyPolicy")}
                </a>
              ),
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
