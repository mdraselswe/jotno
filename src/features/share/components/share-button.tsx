"use client";

import { Check, Ellipsis, Link2, Share2 } from "lucide-react";
import { useState, useSyncExternalStore, type ComponentProps } from "react";
import { toast } from "sonner";
import { SocialIcon } from "@/components/brand/social-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/i18n/client";
import { MY_REF_COOKIE, readCookie, withRef } from "@/lib/ref";
import { pageLink, SHARE_TARGETS, shareUrl, type ShareTarget } from "../links";

const never = () => () => {};
const isPhone = () => window.matchMedia("(pointer: coarse)").matches;
const hasShareSheet = () => typeof navigator.share === "function";

/**
 * Share a page to Facebook, WhatsApp, Messenger (phones) or copy the link; the
 * phone's own share sheet is one more choice. A signed-in person's links carry
 * their referral code (`?ref=`), read from a cookie at click time, so the page
 * itself stays the same for everyone (cacheable).
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
  const [copied, setCopied] = useState(false);

  function link(): string {
    const base = url ? new URL(url, window.location.origin).toString() : pageLink(window.location.href);
    return withRef(base, readCookie(document.cookie, MY_REF_COOKIE));
  }

  function open(target: ShareTarget) {
    const href = shareUrl(target, link(), text ?? title);
    if (target === "messenger") window.location.assign(href);
    else window.open(href, "_blank", "noopener,noreferrer,width=640,height=640");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      toast.success(t("common.copied"));
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(t("share.copyFailed"));
    }
  }

  async function more() {
    try {
      await navigator.share({ title, text: text ?? title, url: link() });
    } catch {
      // Closing the share sheet is not an error.
    }
  }

  const targets = SHARE_TARGETS.filter((target) => target !== "messenger" || phone);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant={variant} size={size} className={className}>
            <Share2 aria-hidden="true" />
            {label ?? t("share.button")}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-52">
        {targets.map((target) => (
          <DropdownMenuItem key={target} onClick={() => open(target)}>
            <SocialIcon kind={target} className="size-4" />
            {t(`share.${target}` as const)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={() => void copy()}>
          {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
          {t("share.copy")}
        </DropdownMenuItem>
        {sheet ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void more()}>
              <Ellipsis aria-hidden="true" />
              {t("share.more")}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
