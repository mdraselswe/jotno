"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { publicEnv } from "@/config/env";
import { supabaseBrowser } from "@/infrastructure/supabase/browser";
import { headerProfile, type HeaderProfile } from "../server/actions";

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  role: "owner" | "vet" | "admin";
  /** Photo URL: one uploaded on Jotno, else the vet photo, else the Google one. */
  avatarUrl: string | null;
}

/** One database read per person and photo (shared by every header on the page). */
const profiles = new Map<string, Promise<HeaderProfile | null>>();

const PROFILE_CHANGED = "jotno:profile-changed";

/**
 * Call after saving a new name or photo (account settings, vet profile): every
 * avatar on the page reloads it without a page reload.
 */
export function profileChanged(): void {
  profiles.clear();
  window.dispatchEvent(new Event(PROFILE_CHANGED));
}

function loadProfile(key: string): Promise<HeaderProfile | null> {
  let p = profiles.get(key);
  if (!p) {
    p = headerProfile().catch(() => null);
    profiles.set(key, p);
  }
  return p;
}

/**
 * The signed-in person as the browser sees it (header and small UI only; the
 * server re-checks everything). `undefined` until the session is read.
 * The token gives a first guess at once; the real name and photo then come
 * from the profile in the database (the token often has no photo: seeded
 * accounts, vets whose photo is on their vet profile).
 */
export function useAuthUser(): AuthUser | null | undefined {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    // Reloads the name and photo from the database for the current person.
    let merge: (() => void) | null = null;
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
        const google = typeof meta.avatar_url === "string" ? meta.avatar_url : meta.picture;
        const avatarPath = typeof meta.avatar_path === "string" ? meta.avatar_path : "";
        const avatarUrl = avatarPath
          ? `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${avatarPath}`
          : typeof google === "string" && google.startsWith("https://")
            ? google
            : null;
        const next: AuthUser = {
          id: u.id,
          email: u.email ?? null,
          name,
          avatarUrl,
          role: role === "vet" || role === "admin" ? role : "owner",
        };
        setUser(next);
        merge = () =>
          void loadProfile(`${u.id}:${avatarPath}`).then((p) => {
            if (!alive || !p) return;
            setUser((cur) =>
              cur && cur.id === next.id
                ? { ...cur, name: p.name ?? cur.name, avatarUrl: p.avatarUrl ?? cur.avatarUrl }
                : cur,
            );
          });
        merge();
      },
    );
    const onChanged = () => merge?.();
    window.addEventListener(PROFILE_CHANGED, onChanged);
    return () => {
      alive = false;
      data.subscription.unsubscribe();
      window.removeEventListener(PROFILE_CHANGED, onChanged);
    };
  }, []);
  return user;
}
