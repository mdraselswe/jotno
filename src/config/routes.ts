/**
 * Internal pages, without the locale prefix and without a trailing slash
 * (the build adds it: `trailingSlash: true`). Add a page here when you create
 * one under src/app/[locale]/. Link to them with `localeHref(locale, ROUTES.x)`
 * (src/lib/locale-href.ts), which adds the prefix for non-default languages.
 * Dynamic pages have a helper below (`vetPath("slug")`).
 * Plain data (no Next imports) so scripts can read it too.
 */
export const ROUTES = {
  home: "/",
  about: "/about",
  vets: "/vets",
  questions: "/questions",
  ask: "/questions/ask",
  emergency: "/emergency",
  articles: "/articles",
  shop: "/shop",
  cart: "/shop/cart",
  forVets: "/for-vets",
  terms: "/legal/terms",
  privacy: "/legal/privacy",
  refund: "/legal/refund",
  telemedicine: "/legal/telemedicine",
  login: "/login",
  onboarding: "/onboarding",
  // Owner
  account: "/account",
  pets: "/account/pets",
  newPet: "/account/pets/new",
  consults: "/account/consults",
  appointments: "/account/appointments",
  orders: "/account/orders",
  settings: "/account/settings",
  chat: "/chat",
  // Vet
  dashboard: "/dashboard",
  vetProfile: "/dashboard/profile",
  vetConsults: "/dashboard/consults",
  vetQuestions: "/dashboard/questions",
  vetSchedule: "/dashboard/schedule",
  vetAppointments: "/dashboard/appointments",
  vetEarnings: "/dashboard/earnings",
  vetArticles: "/dashboard/articles",
  vetNewArticle: "/dashboard/articles/new",
  vetFeatured: "/dashboard/featured",
  // Admin
  admin: "/admin",
  adminVets: "/admin/vets",
  adminFeatured: "/admin/featured",
  adminPayouts: "/admin/payouts",
  adminReports: "/admin/reports",
  adminShop: "/admin/shop",
  adminAudit: "/admin/audit",
  /** Design-system preview, development only (not in the sitemap; robots.txt disallows it). */
  dev: "/dev",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/** Pages listed in the sitemap (each in every language). Vet, question and article pages come from the database. */
export const SITEMAP_ROUTES: readonly string[] = [
  ROUTES.home,
  ROUTES.about,
  ROUTES.vets,
  ROUTES.questions,
  ROUTES.emergency,
  ROUTES.articles,
  ROUTES.shop,
  ROUTES.forVets,
  ROUTES.terms,
  ROUTES.privacy,
  ROUTES.refund,
  ROUTES.telemedicine,
];

/** The served URL of a route (`/about` → `/about/`). */
export const pageUrl = (route: string) => (route.endsWith("/") ? route : `${route}/`);

// Dynamic pages
export const vetPath = (slug: string) => `/vet/${slug}`;
export const questionPath = (id: string) => `/questions/${id}`;
export const articlePath = (slug: string) => `/articles/${slug}`;
export const productPath = (slug: string) => `/shop/${slug}`;
export const chatPath = (consultId: string) => `/chat/${consultId}`;
export const petPath = (id: string) => `/account/pets/${id}`;
export const consultStartPath = (slug: string) => `/vet/${slug}/consult`;
export const bookPath = (slug: string) => `/vet/${slug}/book`;
export const adminVetPath = (id: string) => `/admin/vets/${id}`;
export const vetArticlePath = (id: string) => `/dashboard/articles/${id}`;
export const adminProductPath = (id: string) => `/admin/shop/${id}`;
