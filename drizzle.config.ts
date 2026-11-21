import { defineConfig } from "drizzle-kit";

/**
 * Migrations are SQL files in supabase/migrations, so the Supabase CLI
 * (`supabase db reset` locally, `supabase db push` in the cloud) applies them.
 * `pnpm db:generate` writes a new one after you change src/infrastructure/db/schema.ts.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/db/schema.ts",
  out: "./supabase/migrations",
  migrations: { prefix: "supabase" },
  schemaFilter: ["public"],
  entities: { roles: { provider: "supabase" } },
  dbCredentials: {
    // Local Supabase (pnpm db:start). Only drizzle-kit reads this file.
    url: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  },
});
