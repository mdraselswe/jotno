"use client";

import { Check, Copy, Ellipsis, Link2, Share2 } from "lucide-react";
import { useState, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { toast } from "sonner";
import { SocialIcon } from "@/components/brand/social-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useT } from "@/i18n/client";
import { MY_REF_COOKIE, readCookie, withRef } from "@/lib/ref";
import { withTrailingSlash } from "@/lib/trailing-slash";
import { pageLink, SHARE_TARGETS, shareUrl, type ShareTarget } from "../links";

const never = () => () => {};
const isPhone = () => window.matchMedia("(pointer: coarse)").matches;
const hasShareSheet = () => typeof navigator.share === "function";

/** One app in the sheet: a round tile with the app's mark and its name under it. */
function AppTile({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group grid justify-items-center gap-1.5 rounded-(--radius-lg) p-1 text-xs font-medium text-foreground/80 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="grid size-13 place-items-center rounded-full bg-muted text-foreground ring-1 ring-foreground/6 transition-[background-color,scale] duration-(--motion-fast) group-hover:bg-primary/10 group-hover:text-primary group-active:scale-95">
        {children}
      </span>
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}

/**
 * Share a page: a sheet (from the bottom on phones, a card on bigger screens)
 * with WhatsApp, Facebook, Messenger (phones) and the phone's own share sheet
 * as app tiles, and the link with a copy button. A signed-in person's links
 * carry their referral code (`?ref=`), read from a cookie when the sheet opens,
 * so the page itself stays the same for everyone (cacheable).
 */
export function ShareButton({
  title,
  text,
  url,
  label,
  variant = "outline",
  size = "sm",
  className,
}: {
  title: string;
  /** Shown before the link in WhatsApp and the share sheet (default: the title). */
  text?: string;
  /** Path or absolute URL to share (default: this page). */
  url?: string;
  label?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const t = useT();
  const phone = useSyncExternalStore(never, isPhone, () => false);
  const sheet = useSyncExternalStore(never, hasShareSheet, () => false);
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");
  const [copied, setCopied] = useState(false);

  function link(): string {
    const base = url ? new URL(url, window.location.origin).toString() : pageLink(window.location.href);
    return withRef(withTrailingSlash(base), readCookie(document.cookie, MY_REF_COOKIE));
  }

  function onOpenChange(next: boolean) {
    if (next) {
      setHref(link());
      setCopied(false);
    }
    setOpen(next);
  }

  function openApp(target: ShareTarget) {
    const to = shareUrl(target, href || link(), text ?? title);
    if (target === "messenger") window.location.assign(to);
    else window.open(to, "_blank", "noopener,noreferrer,width=640,height=640");
    setOpen(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(href || link());
      setCopied(true);
      toast.success(t("common.copied"));
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(t("share.copyFailed"));
    }
  }

  async function more() {
    try {
      await navigator.share({ title, text: text ?? title, url: href || link() });
      setOpen(false);
    } catch {
      // Closing the share sheet is not an error.
    }
  }

  // WhatsApp first: most people here share there.
  const order: readonly ShareTarget[] = ["whatsapp", ...SHARE_TARGETS.filter((x) => x !== "whatsapp")];
  const targets = order.filter((target) => target !== "messenger" || phone);
  // Show the address without the scheme; the copy button copies all of it.
  const shown = href.replace(/^https?:\/\//, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button type="button" variant={variant} size={size} className={className}>
            <Share2 aria-hidden="true" />
            {label ?? t("share.button")}
          </Button>
        }
      />
      <DialogContent className="gap-5 p-5 max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-t-(--radius-2xl) max-sm:rounded-b-none max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-(--radius-2xl)">
        <span aria-hidden="true" className="mx-auto -mt-2 h-1 w-10 rounded-full bg-foreground/15 sm:hidden" />
        <div className="grid gap-1.5 pe-8">
          <DialogTitle className="text-lg font-bold">{t("share.title")}</DialogTitle>
          <DialogDescription className="line-clamp-2 text-pretty">{title}</DialogDescription>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {targets.map((target) => (
            <AppTile key={target} label={t(`share.${target}` as const)} onClick={() => openApp(target)}>
              <SocialIcon kind={target} className="size-6" />
            </AppTile>
          ))}
          {sheet ? (
            <AppTile label={t("share.moreShort")} onClick={() => void more()}>
              <Ellipsis aria-hidden="true" className="size-6" />
            </AppTile>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground">{t("share.link")}</p>
          <div className="flex items-center gap-2 rounded-(--radius-xl) bg-muted/70 p-1.5 ps-3 ring-1 ring-foreground/6">
            <Link2 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm" dir="ltr" title={href}>
              {shown}
            </span>
            <Button type="button" variant="brand" size="sm" onClick={() => void copy()} className="shrink-0">
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? t("share.copiedShort") : t("share.copy")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
