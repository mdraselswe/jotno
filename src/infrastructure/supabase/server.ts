import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv, serverEnv } from "@/config/env";

/**
 * Supabase for the signed-in person in Server Components, Server Actions and
 * Route Handlers. Session cookies are read and refreshed through next/headers.
 */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component: proxy.ts refreshes the cookies instead.
        }
      },
    },
  });
}

/** Service-role client: storage signing and admin auth calls. Bypasses RLS; server only. */
export function supabaseAdmin() {
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
