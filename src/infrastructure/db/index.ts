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
 * request opens one small client (React `cache` scopes it to the request; the
 * Supabase pooler or Hyperdrive keeps the real connections). On Node (dev,
 * tests) one client is reused.
 */
const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

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

const perRequest = cache(connect);

export function db(): Database {
  if (onWorkers) return perRequest();
  shared ??= connect();
  return shared;
}

export { schema };
