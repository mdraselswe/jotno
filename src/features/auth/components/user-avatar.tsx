"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { AuthUser } from "./use-auth-user";

/** First letter of the name (or email) for the fallback circle. */
export function initialOf(user: Pick<AuthUser, "name" | "email">) {
  return (user.name ?? user.email ?? "?").trim().charAt(0).toUpperCase() || "?";
}

/**
 * The signed-in person's photo, cropped to a circle and centred (object-cover
 * on a square box), with their initial while it loads or if it fails.
 */
export function UserAvatar({
  user,
  className,
}: {
  user: Pick<AuthUser, "name" | "email" | "avatarUrl">;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-9 overflow-hidden bg-muted", className)}>
      {user.avatarUrl ? (
        <AvatarImage
          src={user.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="object-cover object-center"
        />
      ) : null}
      <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
        {initialOf(user)}
      </AvatarFallback>
    </Avatar>
  );
}
