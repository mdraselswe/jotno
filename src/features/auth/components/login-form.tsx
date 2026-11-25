"use client";

import { ArrowLeft, Mail, MailCheck, PawPrint, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Spot } from "@/components/illustrations/spots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkedText } from "@/components/ui/linked-text";
import { Skeleton } from "@/components/ui/skeleton";
import { publicEnv } from "@/config/env";
import { ROUTES } from "@/config/routes";
import { useLocale, useT } from "@/i18n/client";
import { supabaseBrowser } from "@/infrastructure/supabase/browser";
import { localeHref } from "@/lib/locale-href";
import { demoSignIn, sendCode, verifyCode, type DemoRole } from "../server/actions";

const RESEND_SECONDS = 30;

const DEMO_ROLES = [
  ["owner", PawPrint, "auth.demoOwner", "ownerui.login.demoOwnerHint"],
  ["vet", Stethoscope, "auth.demoVet", "ownerui.login.demoVetHint"],
  ["admin", ShieldCheck, "auth.demoAdmin", "ownerui.login.demoAdminHint"],
] as const;

const CARD =
  "mx-auto grid w-full max-w-md gap-6 rounded-(--radius-3xl) bg-card p-5 shadow-(--shadow-card) ring-1 ring-foreground/6 sm:p-8";

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
    if (pending) return;
    setError(null);
    start(async () => {
      const result = await sendCode(email, locale, next);
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
    if (pending) return;
    setError(null);
    start(async () => {
      const result = await verifyCode(locale, email, code, next);
      if (!result.ok) {
        setError(t(result.error));
        return;
      }
      // A full load, so the header and every cached page see the new session.
      window.location.assign(result.url);
    });
  }

  function demo(role: DemoRole) {
    setError(null);
    start(async () => {
      const result = await demoSignIn(locale, role);
      if (!result.ok) {
        setError(t(result.error));
        return;
      }
      window.location.assign(result.url);
    });
  }

  function google() {
    setError(null);
    start(async () => {
      const origin = window.location.origin;
      const target = new URL("/auth/callback/", origin);
      if (next) target.searchParams.set("next", next);
      target.searchParams.set("locale", locale);
      // Success leaves the page for Google; only a failure comes back here.
      const { error: oauthError } = await supabaseBrowser().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: target.toString() },
      });
      if (oauthError) setError(t("auth.callbackError"));
    });
  }

  const errorLine = error ? (
    <p
      id="login-error"
      role="alert"
      className="rounded-(--radius-lg) bg-destructive/8 px-3 py-2 text-center text-sm text-destructive"
    >
      {error}
    </p>
  ) : null;

  return (
    <div className={CARD}>
      {step === "email" ? (
        <>
          <div className="grid justify-items-center gap-2 text-center">
            <Spot name="welcome" className="w-28 lg:hidden" />
            <h1 className="font-heading text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              {t("auth.title")}
            </h1>
            <p className="text-sm text-pretty text-muted-foreground sm:text-base">{t("auth.sub")}</p>
          </div>

          <div className="grid gap-4">
            {publicEnv.NEXT_PUBLIC_GOOGLE_AUTH ? (
              <>
                <Button type="button" variant="outline" size="lg" disabled={pending} onClick={google}>
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
                className="h-(--control-h-lg)"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "login-error" : undefined}
              />
              <Button type="submit" variant="brand" size="lg" disabled={pending || email.trim().length < 5}>
                <Mail aria-hidden="true" />
                {pending ? t("auth.sending") : t("auth.sendCode")}
              </Button>
            </form>
            {errorLine}
          </div>

          {publicEnv.NEXT_PUBLIC_DEMO && publicEnv.NEXT_PUBLIC_DEMO_LOGIN ? (
            <section
              aria-labelledby="demo-title"
              className="grid gap-3 rounded-(--radius-2xl) bg-highlight/15 p-4 ring-1 ring-highlight/40"
            >
              <p id="demo-title" className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles aria-hidden="true" className="size-4 text-primary" />
                {t("auth.demoTitle")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ROLES.map(([role, Icon, label, hint]) => (
                  <button
                    key={role}
                    type="button"
                    disabled={pending}
                    onClick={() => demo(role)}
                    className="grid min-h-22 content-start justify-items-center gap-1.5 rounded-(--radius-xl) bg-card px-1.5 py-3 text-center shadow-(--shadow-control) ring-1 ring-foreground/8 transition-[box-shadow,translate] duration-(--motion-fast) ease-(--ease-press) hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-(--press-scale) disabled:pointer-events-none disabled:opacity-50 motion-reduce:hover:translate-y-0"
                  >
                    <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                      <Icon aria-hidden="true" className="size-4.5" />
                    </span>
                    <span className="text-sm leading-tight font-semibold">{t(label)}</span>
                    <span className="text-[0.6875rem] leading-tight text-muted-foreground max-sm:sr-only">
                      {t(hint)}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t("auth.demoNote")}</p>
            </section>
          ) : null}
        </>
      ) : (
        <form onSubmit={verify} className="grid gap-4" noValidate>
          <div className="grid justify-items-center gap-3 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
              <MailCheck aria-hidden="true" className="size-7" />
            </span>
            <h1 className="font-heading text-2xl font-bold tracking-tight">{t("ownerui.login.codeTitle")}</h1>
            <p className="text-sm break-words text-muted-foreground" aria-live="polite">
              {t("auth.codeSent", { email })}
            </p>
          </div>
          <div className="grid gap-2">
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
          </div>
          <Button type="submit" variant="brand" size="lg" disabled={pending || code.length !== 6}>
            {pending ? t("auth.verifying") : t("auth.verify")}
          </Button>
          {errorLine}
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <Button
              type="button"
              variant="link"
              className="px-0"
              onClick={() => {
                setStep("email");
                setError(null);
              }}
            >
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

      <p className="text-center text-xs text-pretty text-muted-foreground">
        <LinkedText
          text={t("auth.terms")}
          hrefs={[`${localeHref(locale, ROUTES.terms)}/`, `${localeHref(locale, ROUTES.privacy)}/`]}
        />
      </p>
    </div>
  );
}

/** Loading twin of the sign-in card. */
export function LoginFormSkeleton() {
  return (
    <div className={CARD} role="status">
      <div className="grid justify-items-center gap-3">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-(--control-h-lg) w-full rounded-(--control-radius)" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-(--control-h-lg) w-full rounded-(--control-radius)" />
        <Skeleton className="h-(--control-h-lg) w-full rounded-(--control-radius)" />
      </div>
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
