"use client";

import { ArrowLeft, EllipsisVertical, FilePenLine, FileText, Flag, Lock, UserRound } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { ChatAvatar } from "./chat-thread-view";
import { CloseConsultDialog } from "./consult-forms";
import { ReportConsultButton } from "./report-consult";

export interface ChatPerson {
  name: string;
  photoUrl: string | null;
  /** Their public page (the vet's profile), or null. */
  href: string | null;
}

/** Messenger-style top bar: back, who, status line, call buttons, the menu. */
export function ChatHeader({
  backHref,
  other,
  status,
  statusTone = "muted",
  online,
  calls,
  menu,
}: {
  backHref: string;
  other: ChatPerson;
  status: string;
  statusTone?: "muted" | "primary" | "success";
  online: boolean;
  calls?: ReactNode;
  menu?: ReactNode;
}) {
  const t = useT();
  const name = (
    <span className="block truncate text-[0.9375rem] leading-tight font-semibold">{other.name}</span>
  );
  return (
    <header className="flex shrink-0 items-center gap-1 border-b bg-card px-1.5 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
      <Link
        href={backHref as Route}
        aria-label={t("common.back")}
        className="grid size-10 shrink-0 place-items-center rounded-full text-foreground/80 transition-colors duration-(--motion-fast) hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ArrowLeft aria-hidden="true" className="size-5 rtl:rotate-180" />
      </Link>
      <span className="relative shrink-0">
        <ChatAvatar name={other.name} photoUrl={other.photoUrl} className="size-10" />
        {online ? (
          <span
            aria-hidden="true"
            className="absolute end-0 bottom-0 size-3 rounded-full bg-success ring-2 ring-card"
          />
        ) : null}
      </span>
      <div className="grid min-w-0 flex-1 gap-0.5 ps-1">
        {other.href ? (
          <Link
            href={other.href as Route}
            className="min-w-0 rounded-sm hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {name}
          </Link>
        ) : (
          name
        )}
        <span
          aria-live="polite"
          className={cn(
            "truncate text-xs leading-tight",
            statusTone === "primary"
              ? "font-medium text-primary"
              : statusTone === "success"
                ? "font-medium text-success"
                : "text-muted-foreground",
          )}
        >
          {status}
        </span>
      </div>
      {calls}
      {menu}
    </header>
  );
}

const ITEM = "gap-2.5 rounded-(--radius-md) px-2.5 py-2 text-sm";

/** The ⋮ menu: profile, prescription, end chat, report. Dialogs live outside the menu. */
export function ChatMenu({
  consultId,
  profileHref,
  rxHref,
  rx,
  canClose,
  canReport,
}: {
  consultId: string;
  profileHref: string | null;
  /** The prescription page, once there is one. */
  rxHref: string | null;
  /** The vet may write/edit the prescription now (the chat owns the sheet). */
  rx: { editing: boolean; onOpen: () => void } | null;
  canClose: boolean;
  canReport: boolean;
}) {
  const t = useT();
  const [dialog, setDialog] = useState<"close" | "report" | null>(null);
  const toggle = (name: "close" | "report") => (open: boolean) => setDialog(open ? name : null);
  if (!profileHref && !rxHref && !rx && !canClose && !canReport) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-10 shrink-0 rounded-full"
              aria-label={t("chatui.more")}
            />
          }
        >
          <EllipsisVertical aria-hidden="true" className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="w-60 rounded-(--radius-xl) p-1.5">
          <DropdownMenuGroup>
            {profileHref ? (
              <DropdownMenuItem render={<Link href={profileHref as Route} />} className={ITEM}>
                <UserRound aria-hidden="true" />
                {t("chatui.viewProfile")}
              </DropdownMenuItem>
            ) : null}
            {rxHref ? (
              <DropdownMenuItem render={<Link href={rxHref as Route} />} className={ITEM}>
                <FileText aria-hidden="true" />
                {t("chatui.viewRx")}
              </DropdownMenuItem>
            ) : null}
            {rx ? (
              <DropdownMenuItem className={ITEM} onClick={rx.onOpen}>
                <FilePenLine aria-hidden="true" />
                {t(rx.editing ? "rx.edit" : "rx.write")}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
          {canClose || canReport ? (
            <>
              {profileHref || rxHref || rx ? <DropdownMenuSeparator /> : null}
              <DropdownMenuGroup>
                {canClose ? (
                  <DropdownMenuItem className={ITEM} onClick={() => setDialog("close")}>
                    <Lock aria-hidden="true" />
                    {t("chatui.endChat")}
                  </DropdownMenuItem>
                ) : null}
                {canReport ? (
                  <DropdownMenuItem
                    variant="destructive"
                    className={ITEM}
                    onClick={() => setDialog("report")}
                  >
                    <Flag aria-hidden="true" />
                    {t("chatui.report")}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuGroup>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {canClose ? (
        <CloseConsultDialog consultId={consultId} open={dialog === "close"} onOpenChange={toggle("close")} />
      ) : null}
      {canReport ? (
        <ReportConsultButton
          consultId={consultId}
          open={dialog === "report"}
          onOpenChange={toggle("report")}
        />
      ) : null}
    </>
  );
}
