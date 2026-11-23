import "server-only";
import { cache } from "react";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "@/config/env";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

/**
 * The database for server code (features/<name>/server). Never import it in a
 * page or component: call a feature's queries instead.
 *
 * Cloudflare Workers can not share a socket between requests, so there each
 * request opens exactly one small client, kept in OpenNext's per-request store
 * (React `cache` only covers renders; route handlers, server actions and
 * "use cache" fills would otherwise open a new connection, with its password
 * handshake, for every query). The Supabase pooler keeps the real connections.
 * On Node (dev, tests) one client is reused.
 */
// `WebSocketPair` exists only on Cloudflare Workers; the user agent check alone
// missed it inside the OpenNext bundle, which shared one socket across requests.
const onWorkers =
  "WebSocketPair" in globalThis ||
  (typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers");

let shared: Database | undefined;

function connect(): Database {
  const client = postgres(serverEnv().DATABASE_URL, {
    // Transaction-mode poolers (Supabase :6543, Hyperdrive) don't support prepared statements.
    prepare: false,
    max: onWorkers ? 1 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(client, { schema, casing: "snake_case" });
}

const perRender = cache(connect);

/** OpenNext's AsyncLocalStorage: one store per incoming request on Workers. */
interface OpenNextStore {
  requestCache?: { getOrCreate(key: string): Map<string, Database> };
}
function requestStore(): Map<string, Database> | undefined {
  const als = (globalThis as { __openNextAls?: { getStore(): OpenNextStore | undefined } }).__openNextAls;
  return als?.getStore()?.requestCache?.getOrCreate("jotno:db");
}

export function db(): Database {
  if (onWorkers) {
    const store = requestStore();
    if (!store) return perRender();
    let client = store.get("client");
    if (!client) {
      client = connect();
      store.set("client", client);
    }
    return client;
  }
  shared ??= connect();
  return shared;
}

export { schema };
