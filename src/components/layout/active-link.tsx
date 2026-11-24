"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { localePath, splitLocale } from "@/config/locale";

type Match = "exact" | "prefix";

const trim = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);

/**
 * Whether `pathname` is the page (or, with "prefix", a page under) `href`.
 * `pathname` may be the proxy's internal `/<default locale>/…` form; it is
 * compared as the public, unprefixed URL that `href` uses.
 */
export function isActivePath(pathname: string, href: string, match: Match) {
  const { locale, path: rest } = splitLocale(pathname);
  const path = trim(localePath(locale, rest));
  const target = trim(href);
  return match === "exact" ? path === target : path === target || path.startsWith(`${target}/`);
}

interface ActiveLinkProps {
  href: Route;
  /** "exact" for a section's home page, "prefix" (default) to also match pages below it. */
  match?: Match;
  className: (active: boolean) => string;
  children: ReactNode | ((active: boolean) => ReactNode);
}

function Plain({ href, className, children, active }: ActiveLinkProps & { active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={className(active)}>
      {typeof children === "function" ? children(active) : children}
    </Link>
  );
}

function Current(props: ActiveLinkProps) {
  const pathname = usePathname();
  return <Plain {...props} active={isActivePath(pathname, props.href, props.match ?? "prefix")} />;
}

/**
 * A nav link that marks the current page. The path is request data, so the
 * marked state streams in under Suspense while the plain link is prerendered;
 * that keeps every page, dynamic ones too, in the static shell.
 */
export function ActiveLink(props: ActiveLinkProps) {
  return (
    <Suspense fallback={<Plain {...props} active={false} />}>
      <Current {...props} />
    </Suspense>
  );
}
