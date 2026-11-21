/**
 * Removes every demo row (is_demo = true, and demo users with everything they
 * own) before real users arrive. Run once against the cloud database:
 *
 *   DATABASE_URL=… pnpm db:clear-demo        (or set it in .env.local)
 *   pnpm db:clear-demo --dry-run             counts only, changes nothing
 *
 * Then set NEXT_PUBLIC_DEMO=false and redeploy so the demo banner goes away.
 */
import { existsSync } from "node:fs";
import postgres from "postgres";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const dryRun = process.argv.includes("--dry-run");
const sql = postgres(url, { max: 1, prepare: false });

const STEPS: { label: string; query: string }[] = [
  // Keep real orders readable: detach demo products from order lines first.
  {
    label: "order lines → demo products",
    query:
      "update public.order_items set product_id = null where product_id in (select id from public.products where is_demo)",
  },
  { label: "demo products", query: "delete from public.products where is_demo" },
  { label: "demo articles", query: "delete from public.articles where is_demo" },
  { label: "demo reviews", query: "delete from public.reviews where is_demo" },
  { label: "demo questions", query: "delete from public.questions where is_demo" },
  { label: "demo pets", query: "delete from public.patients where is_demo" },
  { label: "demo vets", query: "delete from public.providers where is_demo" },
  // Demo people: deleting the auth user cascades to profile, pets, chats, bookings…
  {
    label: "demo users",
    query: "delete from auth.users where id in (select id from public.profiles where is_demo)",
  },
];

try {
  await sql.begin(async (tx) => {
    for (const step of STEPS) {
      const result = await tx.unsafe(step.query);
      console.log(`${dryRun ? "would remove" : "removed"} ${result.count} × ${step.label}`);
    }
    if (dryRun) throw new Error("dry-run");
  });
  console.log("Done. Set NEXT_PUBLIC_DEMO=false and redeploy.");
} catch (error) {
  if (error instanceof Error && error.message === "dry-run") console.log("Dry run: rolled back.");
  else {
    console.error(error);
    process.exitCode = 1;
  }
} finally {
  await sql.end();
}
