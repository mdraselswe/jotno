import type { MessageKey } from "@/i18n";
import { ROUTES, type AppRoute } from "./routes";

export interface NavLink {
  /** A page from ROUTES (no locale prefix); components add the locale with `localeHref`. */
  href: AppRoute;
  label: MessageKey;
}

/** ✏️ Header links (desktop). Labels are i18n keys. */
export const NAV_LINKS: readonly NavLink[] = [
  { href: ROUTES.vets, label: "nav.vets" },
  { href: ROUTES.questions, label: "nav.questions" },
  { href: ROUTES.articles, label: "nav.articles" },
  { href: ROUTES.shop, label: "nav.shop" },
];

/** Footer links. */
export const FOOTER_LINKS: readonly NavLink[] = [
  { href: ROUTES.about, label: "nav.about" },
  { href: ROUTES.forVets, label: "nav.forVets" },
  { href: ROUTES.emergency, label: "nav.emergency" },
  { href: ROUTES.terms, label: "nav.terms" },
  { href: ROUTES.privacy, label: "nav.privacy" },
  { href: ROUTES.refund, label: "nav.refund" },
  { href: ROUTES.telemedicine, label: "nav.telemedicine" },
];

/** Mobile bottom tab bar: Home · Vets · Ask · Chats · Me. Icons live in the component. */
export const TAB_LINKS = [
  { href: ROUTES.home, label: "nav.home", icon: "home" },
  { href: ROUTES.vets, label: "nav.vets", icon: "stethoscope" },
  { href: ROUTES.questions, label: "nav.questions", icon: "message-circle-question" },
  { href: ROUTES.consults, label: "nav.chat", icon: "messages-square" },
  { href: ROUTES.account, label: "nav.me", icon: "user" },
] as const satisfies readonly (NavLink & { icon: string })[];
