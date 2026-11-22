import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/db";

/**
 * Sign-in creates the account as soon as a code is requested, so a mistyped
 * email leaves an account nobody can use. Once a day, remove accounts that
 * never entered their code within 7 days and never finished onboarding (their
 * profile goes with them; they can't have orders, chats or payments).
 */
export async function removeUnconfirmedAccounts(): Promise<{ removed: number }> {
  const rows = await db().execute<{ id: string }>(sql`
    delete from auth.users u
    where u.email_confirmed_at is null
      and u.last_sign_in_at is null
      and u.created_at < now() - interval '7 days'
      and not exists (select 1 from public.profiles p where p.id = u.id and p.onboarded)
    returning u.id
  `);
  return { removed: rows.length };
}
