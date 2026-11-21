"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/config/env";

let client: ReturnType<typeof createBrowserClient> | undefined;

/** Supabase in the browser (sign-in, Realtime chat). One client per tab. */
export function supabaseBrowser() {
  client ??= createBrowserClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return client;
}
