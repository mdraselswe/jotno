"use client";

import { LayoutDashboard, LogOut, PawPrint, Settings, ShieldCheck, UserRound } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { clearOfflineCache } from "@/features/pwa";
import { useLocale, useT } from "@/i18n/client";
import { supabaseBrowser } from "@/infrastructure/supabase/browser";
import { localeHref } from "@/lib/locale-href";
import { useAuthUser } from "./use-auth-user";

/** Header account control: "Sign in", or the avatar menu. */
export function UserMenu() {
  const user = useAuthUser();
  const t = useT();
  const locale = useLocale();
  const router = useRouter();

  if (user === undefined) return <Skeleton className="h-(--control-h-sm) w-20 rounded-(--control-radius)" />;
  if (!user)
    return (
      <ButtonLink href={localeHref(locale, ROUTES.login)} size="sm" className="min-w-20">
        {t("nav.signIn")}
      </ButtonLink>
    );

  const initial = (user.name ?? user.email ?? "?").trim().charAt(0).toUpperCase();
  const item = (href: Route, icon: ReactNode, label: string) => (
    <DropdownMenuItem render={<Link href={href} />}>
      {icon}
      {label}
    </DropdownMenuItem>
  );

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    await clearOfflineCache();
    router.replace(localeHref(locale, ROUTES.home));
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("nav.account")}>
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- storage or Google URL, 32px
              <img src={user.avatarUrl} alt="" className="size-8 rounded-full object-cover" />
            ) : (
              <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {initial}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        {/* Base UI throws if a group label sits outside a group. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{user.name ?? user.email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {item(localeHref(locale, ROUTES.account), <UserRound aria-hidden="true" />, t("nav.account"))}
        {item(localeHref(locale, ROUTES.pets), <PawPrint aria-hidden="true" />, t("account.pets"))}
        {user.role !== "owner"
          ? item(
              localeHref(locale, ROUTES.dashboard),
              <LayoutDashboard aria-hidden="true" />,
              t("nav.dashboard"),
            )
          : null}
        {user.role === "admin"
          ? item(localeHref(locale, ROUTES.admin), <ShieldCheck aria-hidden="true" />, t("nav.admin"))
          : null}
        {item(localeHref(locale, ROUTES.settings), <Settings aria-hidden="true" />, t("account.settings"))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut aria-hidden="true" />
          {t("nav.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
