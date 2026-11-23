import { expect, type Page } from "@playwright/test";
import postgres from "postgres";

/**
 * Helpers for signed-in flows against the local Supabase stack (`pnpm db:start`):
 * sign in through the real email-code form, reading the code from Mailpit, and
 * set up rows directly in Postgres. Tests that use these skip when the local
 * stack isn't running.
 */
// The local stack's fixed ports (supabase/config.toml).
const MAILPIT = "http://127.0.0.1:54324";
export const DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export async function localStackUp(): Promise<boolean> {
  try {
    const res = await fetch(`${MAILPIT}/api/v1/messages?limit=1`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export function sql() {
  return postgres(DATABASE_URL, { max: 2, onnotice: () => undefined });
}

interface MailList {
  messages: { ID: string; To: { Address: string }[]; Created: string }[];
}

async function latestCode(email: string, after: number): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=5`);
    const list = (await res.json()) as MailList;
    const fresh = list.messages.find((m) => new Date(m.Created).getTime() >= after - 1000);
    if (fresh) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${fresh.ID}`)).json()) as { Text: string };
      const code = /\b(\d{6})\b/.exec(msg.Text)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no sign-in code for ${email}`);
}

/** Signs in with the email code form (English pages). */
export async function signIn(page: Page, email: string, next = "/en/account/") {
  // Repeated local runs would hit the app's 5-codes-per-15-minutes limit.
  const db = sql();
  try {
    await db`delete from public.rate_limits where key like ${"otp:%"}`;
  } finally {
    await db.end();
  }
  // Keep the install-the-app card from popping up over the page.
  await page.addInitScript(() => localStorage.setItem("jotno:install-dismissed", String(Date.now())));
  await page.goto(`/en/login/?next=${encodeURIComponent(next)}`);
  const sentAt = Date.now();
  await page.locator("#login-email").fill(email);
  await page.getByRole("button", { name: "Send me a code" }).click();
  const code = await latestCode(email, sentAt);
  await page.locator("#login-code").fill(code);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login\//, { timeout: 20_000 });
}

/** An open (paid) consult between a demo owner and a demo vet. Returns its id. */
export async function openConsult(ownerEmail: string, vetEmail: string): Promise<string> {
  const db = sql();
  try {
    const rows = await db<{ id: string }[]>`
      insert into public.consults (owner_id, provider_id, status, fee, commission, summary, opened_at, closes_at)
      select o.id, p.id, 'active', 50000, 5000, 'E2E: my cat is limping since yesterday.', now(), now() + interval '24 hours'
      from public.profiles o, public.providers p
      join public.profiles vp on vp.id = p.profile_id
      where o.email = ${ownerEmail} and vp.email = ${vetEmail}
      returning id`;
    const id = rows[0]?.id;
    if (!id) throw new Error("could not create a consult");
    await db`insert into public.messages (consult_id, sender_id, body) values (${id}, null, 'system:opened')`;
    return id;
  } finally {
    await db.end();
  }
}

/** Removes the consults `openConsult` made (calls and messages go with them). */
export async function removeTestConsults(): Promise<void> {
  const db = sql();
  try {
    await db`delete from public.consults where summary like ${"E2E:%"}`;
  } finally {
    await db.end();
  }
}
