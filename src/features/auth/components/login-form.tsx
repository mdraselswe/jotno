"use client";

import { ArrowLeft, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Spot } from "@/components/illustrations/spots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkedText } from "@/components/ui/linked-text";
import { publicEnv } from "@/config/env";
import { ROUTES } from "@/config/routes";
import { useLocale, useT } from "@/i18n/client";
import { supabaseBrowser } from "@/infrastructure/supabase/browser";
import { localeHref } from "@/lib/locale-href";
import { sendCode, verifyCode } from "../server/actions";

const RESEND_SECONDS = 30;

export function LoginForm() {
  const t = useT();
  const locale = useLocale();
  const next = useSearchParams().get("next");
  const callbackError = useSearchParams().get("error");
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(callbackError ? t("auth.callbackError") : null);
  const [wait, setWait] = useState(0);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  function send(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    start(async () => {
      const result = await sendCode(email);
      if (!result.ok) {
        setError(t(result.error));
        return;
      }
      setStep("code");
      setCode("");
      setWait(RESEND_SECONDS);
    });
  }

  function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const result = await verifyCode(locale, email, code, next);
      // Success redirects on the server; we only get here on failure.
      if (result && !result.ok) setError(t(result.error));
    });
  }

  async function google() {
    const origin = window.location.origin;
    const target = new URL("/auth/callback/", origin);
    if (next) target.searchParams.set("next", next);
    target.searchParams.set("locale", locale);
    await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: target.toString() },
    });
  }

  return (
    <div className="mx-auto grid w-full max-w-sm gap-6">
      <div className="grid justify-items-center gap-3 text-center">
        <Spot name="welcome" className="w-36" />
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{t("auth.title")}</h1>
        <p className="text-pretty text-muted-foreground">{t("auth.sub")}</p>
      </div>

      {step === "email" ? (
        <div className="grid gap-4">
          {publicEnv.NEXT_PUBLIC_GOOGLE_AUTH ? (
            <>
              <Button type="button" variant="outline" size="lg" onClick={google}>
                <GoogleIcon />
                {t("auth.google")}
              </Button>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                {t("auth.or")}
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          ) : null}
          <form onSubmit={send} className="grid gap-3" noValidate>
            <Label htmlFor="login-email">{t("auth.email")}</Label>
            <Input
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
            />
            <Button type="submit" size="lg" disabled={pending || email.length < 5}>
              <Mail aria-hidden="true" />
              {pending ? t("auth.sending") : t("auth.sendCode")}
            </Button>
          </form>
        </div>
      ) : (
        <form onSubmit={verify} className="grid gap-3" noValidate>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t("auth.codeSent", { email })}
          </p>
          <Label htmlFor="login-code">{t("auth.code")}</Label>
          <Input
            id="login-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
          />
          <Button type="submit" size="lg" disabled={pending || code.length !== 6}>
            {pending ? t("auth.verifying") : t("auth.verify")}
          </Button>
          <div className="flex items-center justify-between gap-2 text-sm">
            <Button type="button" variant="link" className="px-0" onClick={() => setStep("email")}>
              <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
              {t("auth.changeEmail")}
            </Button>
            <Button
              type="button"
              variant="link"
              className="px-0"
              disabled={wait > 0 || pending}
              onClick={() => send()}
            >
              {wait > 0 ? t("auth.resendIn", { s: wait }) : t("auth.resend")}
            </Button>
          </div>
        </form>
      )}

      {error ? (
        <p id="login-error" role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <p className="text-center text-xs text-pretty text-muted-foreground">
        <LinkedText
          text={t("auth.terms")}
          hrefs={[`${localeHref(locale, ROUTES.terms)}/`, `${localeHref(locale, ROUTES.privacy)}/`]}
        />
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8Z"
      />
      <path
        fill="#34A853"
        d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.8 0-5.2-1.9-6.1-4.5H2.2v2.8A11 11 0 0 0 12 23Z"
      />
      <path fill="#FBBC05" d="M5.9 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8l3.7-2.8Z" />
      <path
        fill="#EA4335"
        d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.7 2.8C6.8 7.3 9.2 5.4 12 5.4Z"
      />
    </svg>
  );
}
