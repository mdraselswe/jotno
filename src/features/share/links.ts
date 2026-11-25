/** Where a link can be shared from the share menu (pure, so it is unit-tested). */
export type ShareTarget = "facebook" | "whatsapp" | "messenger";

export const SHARE_TARGETS: readonly ShareTarget[] = ["facebook", "whatsapp", "messenger"];

/**
 * The share URL for a network. Facebook reads the page's preview (title,
 * description, image) itself; WhatsApp gets the text with the link after it;
 * Messenger opens the app (phones only: the web version needs an app id).
 */
export function shareUrl(target: ShareTarget, url: string, text?: string): string {
  const link = encodeURIComponent(url);
  switch (target) {
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${link}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(text ? `${text}\n${url}` : url)}`;
    case "messenger":
      return `fb-messenger://share/?link=${link}`;
  }
}

/** The page's own URL without the #fragment. */
export function pageLink(href: string): string {
  return href.split("#")[0] ?? href;
}
