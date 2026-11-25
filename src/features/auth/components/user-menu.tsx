"use client";

import {
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Package,
  PawPrint,
  Settings,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ButtonLink } from "@/components/ui/button-link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES, type AppRoute } from "@/config/routes";
import { clearOfflineCache } from "@/features/pwa";
import type { MessageKey } from "@/i18n";
import { useLocale, useT } from "@/i18n/client";
import { supabaseBrowser } from "@/infrastructure/supabase/browser";
import { localeHref } from "@/lib/locale-href";
import { cn } from "@/lib/utils";
import { useAuthUser, type AuthUser } from "./use-auth-user";
import { UserAvatar } from "./user-avatar";

export const ROLE_LABEL: Record<AuthUser["role"], MessageKey> = {
  owner: "menu.roleOwner",
  vet: "menu.roleVet",
  admin: "menu.roleAdmin",
};

/** Signs out everywhere on this device and goes home. */
export function useSignOut() {
  const locale = useLocale();
  const router = useRouter();
  return async () => {
    await supabaseBrowser().auth.signOut();
    await clearOfflineCache();
    router.replace(localeHref(locale, ROUTES.home));
    router.refresh();
  };
}

const ITEM =
  "group/item gap-3 rounded-(--radius-lg) px-2 py-2 text-sm font-medium focus:bg-muted focus:text-foreground";

function MenuLink({
  href,
  icon: Icon,
  label,
  strong,
}: {
  href: Route;
  icon: LucideIcon;
  label: string;
  strong?: boolean;
}) {
  return (
    <DropdownMenuItem render={<Link href={href} />} className={ITEM}>
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-(--radius-md)",
          strong ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/80",
        )}
      >
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronRight
        aria-hidden="true"
        className="size-4 text-muted-foreground opacity-0 transition-opacity duration-(--motion-fast) group-focus/item:opacity-100"
      />
    </DropdownMenuItem>
  );
}

/** Header account control: "Sign in", or the avatar with the account menu. */
export function UserMenu() {
  const user = useAuthUser();
  const t = useT();
  const locale = useLocale();
  const signOut = useSignOut();

  if (user === undefined) return <Skeleton className="size-10 rounded-full" />;
  if (!user)
    return (
      <ButtonLink href={localeHref(locale, ROUTES.login)} size="sm" className="min-w-20">
        {t("nav.signIn")}
      </ButtonLink>
    );

  const href = (r: AppRoute) => localeHref(locale, r);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("nav.account")}
        className="grid size-10 shrink-0 place-items-center rounded-full p-0.5 ring-1 ring-foreground/10 transition-[box-shadow,scale] duration-(--motion-fast) ease-(--ease-press) outline-none hover:ring-2 hover:ring-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 aria-expanded:ring-2 aria-expanded:ring-primary"
      >
        <UserAvatar user={user} className="size-full" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 rounded-(--radius-2xl) p-2">
        {/* Who is signed in. */}
        <div className="flex items-center gap-3 rounded-(--radius-xl) bg-muted/60 p-3">
          <UserAvatar user={user} className="size-11" />
          <div className="grid min-w-0 flex-1 gap-0.5">
            <p className="truncate text-sm leading-tight font-semibold">{user.name ?? user.email}</p>
            {user.name && user.email ? (
              <p className="truncate text-xs leading-tight text-muted-foreground">{user.email}</p>
            ) : null}
            <span className="mt-1 justify-self-start rounded-full bg-primary/12 px-2 py-0.5 text-[0.6875rem] font-semibold text-primary">
              {t(ROLE_LABEL[user.role])}
            </span>
          </div>
        </div>

        {user.role !== "owner" ? (
          <DropdownMenuGroup className="mt-2 grid gap-0.5">
            {user.role === "admin" ? (
              <MenuLink href={href(ROUTES.admin)} icon={ShieldCheck} label={t("nav.admin")} strong />
            ) : null}
            <MenuLink
              href={href(ROUTES.dashboard)}
              icon={LayoutDashboard}
              label={t("nav.dashboard")}
              strong={user.role === "vet"}
            />
          </DropdownMenuGroup>
        ) : null}

        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuGroup className="grid gap-0.5">
          <MenuLink href={href(ROUTES.account)} icon={UserRound} label={t("nav.account")} />
          <MenuLink href={href(ROUTES.pets)} icon={PawPrint} label={t("account.pets")} />
          <MenuLink href={href(ROUTES.consults)} icon={MessagesSquare} label={t("menu.myChats")} />
          <MenuLink href={href(ROUTES.appointments)} icon={CalendarDays} label={t("menu.appointments")} />
          <MenuLink href={href(ROUTES.orders)} icon={Package} label={t("menu.orders")} />
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuGroup className="grid gap-0.5">
          <MenuLink href={href(ROUTES.settings)} icon={Settings} label={t("account.settings")} />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => void signOut()}
            className={cn(ITEM, "focus:bg-destructive/10")}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-(--radius-md) bg-destructive/10">
              <LogOut aria-hidden="true" className="size-4" />
            </span>
            {t("nav.signOut")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
