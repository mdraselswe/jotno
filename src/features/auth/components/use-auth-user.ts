"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { publicEnv } from "@/config/env";
import { supabaseBrowser } from "@/infrastructure/supabase/browser";

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  role: "owner" | "vet" | "admin";
  /** Photo URL: one uploaded on Jotno, else the Google one. */
  avatarUrl: string | null;
}

/**
 * The signed-in person as the browser sees it (header and small UI only; the
 * server re-checks everything). `undefined` until the session is read.
 */
export function useAuthUser(): AuthUser | null | undefined {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  useEffect(() => {
    const { data } = supabaseBrowser().auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        const u = session?.user;
        if (!u) {
          setUser(null);
          return;
        }
        const role: unknown = u.app_metadata.role;
        const meta = u.user_metadata as Record<string, unknown>;
        const name =
          typeof meta.full_name === "string"
            ? meta.full_name
            : typeof meta.name === "string"
              ? meta.name
              : null;
        const avatarUrl =
          typeof meta.avatar_path === "string" && meta.avatar_path
            ? `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${meta.avatar_path}`
            : typeof meta.avatar_url === "string" && meta.avatar_url.startsWith("https://")
              ? meta.avatar_url
              : null;
        setUser({
          id: u.id,
          email: u.email ?? null,
          name,
          avatarUrl,
          role: role === "vet" || role === "admin" ? role : "owner",
        });
      },
    );
    return () => data.subscription.unsubscribe();
  }, []);
  return user;
}
