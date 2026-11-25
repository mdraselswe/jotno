import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { localStackUp, signIn, sql } from "./helpers/local";

/**
 * Invites and quick help, signed in against the local Supabase stack (sign-in
 * codes come from Mailpit; rows are set up straight in Postgres).
 */
// Each project signs in its own demo people (two code requests for one email
// at once pick up each other's code), and none the call tests use.
const PEOPLE: Record<string, { owner: string; vet: string }> = {
  desktop: { owner: "mim@demo.jotno.test", vet: "nadia@demo.jotno.test" },
  mobile: { owner: "rafiq@demo.jotno.test", vet: "tania@demo.jotno.test" },
};
const people = (project: string) =>
  PEOPLE[project] ?? { owner: "mim@demo.jotno.test", vet: "nadia@demo.jotno.test" };
const summaryFor = (project: string) =>
  `E2E: quick help (${project}), my dog has vomited three times since morning and won't eat.`;

async function cleanUp(project: string) {
  const SUMMARY = summaryFor(project);
  const VET = people(project).vet;
  const db = sql();
  try {
    const consults = await db<{ id: string }[]>`select id from public.consults where summary = ${SUMMARY}`;
    const ids = consults.map((c) => c.id);
    const requests = await db<{ id: string; payment_id: string | null }[]>`
      select id, payment_id from public.quick_requests where summary = ${SUMMARY}`;
    const payments = requests.flatMap((r) => (r.payment_id ? [r.payment_id] : []));
    if (ids.length > 0) await db`delete from public.ledger_entries where ref_id in ${db(ids)}`;
    await db`delete from public.quick_requests where summary = ${SUMMARY}`;
    if (payments.length > 0) await db`delete from public.payments where id in ${db(payments)}`;
    if (ids.length > 0) {
      await db`delete from public.consults where id in ${db(ids)}`;
      await db`
        update public.providers p set consult_count = greatest(0, consult_count - ${ids.length})
        from public.profiles vp where vp.id = p.profile_id and vp.email = ${VET}`;
    }
    await db`
      update public.providers p set duty_start = null, duty_end = null
      from public.profiles vp where vp.id = p.profile_id and vp.email = ${VET}`;
  } finally {
    await db.end();
  }
}

test.describe("invites and quick help", () => {
  // Both sign in demo people; two code requests for one email at once time out.
  test.describe.configure({ mode: "serial" });
  test.beforeEach(async () => {
    test.skip(!(await localStackUp()), "needs the local Supabase stack");
  });
  test.afterAll(async ({}, info) => {
    if (await localStackUp()) await cleanUp(info.project.name);
  });

  test("an owner's invite page shows their link, code and points", async ({ page }, info) => {
    await signIn(page, people(info.project.name).owner, "/en/account/invite/");
    await page.goto("/en/account/invite/");
    await expect(page.getByRole("heading", { level: 1, name: "Invite friends, earn points" })).toBeVisible();
    await expect(page.locator("main p.font-mono").first()).toHaveText(/\?ref=[A-Z0-9]{6}$/);
    await expect(page.getByRole("img", { name: "QR code for your invite link" })).toBeVisible();
    const axe = await new AxeBuilder({ page }).include("main").analyze();
    expect(axe.violations).toEqual([]);
  });

  test("a vet on duty answers a quick-help request and it becomes a quick chat", async ({ page }, info) => {
    const { owner: OWNER, vet: VET } = people(info.project.name);
    const SUMMARY = summaryFor(info.project.name);
    await cleanUp(info.project.name);
    const db = sql();
    try {
      await db`
        update public.providers p set duty_start = 0, duty_end = 0
        from public.profiles vp where vp.id = p.profile_id and vp.email = ${VET}`;
      // A paid request, as it is after the owner's payment goes through.
      const [r] = await db<{ id: string; owner_id: string }[]>`
        insert into public.quick_requests (owner_id, summary, status, fee, commission, opened_at)
        select id, ${SUMMARY}, 'open', 9900, 2900, now() from public.profiles where email = ${OWNER}
        returning id, owner_id`;
      if (!r) throw new Error("could not create a quick-help request");
      const [p] = await db<{ id: string }[]>`
        insert into public.payments (user_id, purpose, ref_id, amount, gateway, status)
        values (${r.owner_id}, 'quick', ${r.id}, 9900, 'manual', 'paid')
        returning id`;
      if (!p) throw new Error("could not create its payment");
      await db`update public.quick_requests set payment_id = ${p.id} where id = ${r.id}`;
    } finally {
      await db.end();
    }

    await signIn(page, VET, "/en/dashboard/quick/");
    await page.goto("/en/dashboard/quick/");
    await expect(page.getByText("You're on duty now")).toBeVisible();
    const card = page.locator("main li").filter({ hasText: SUMMARY });
    await expect(card).toBeVisible();
    // A fill before hydration is reset by the controlled textarea: fill until the button wakes up.
    const answer = card.getByRole("button", { name: "Answer" });
    await expect(async () => {
      await card
        .getByLabel("Your answer")
        .fill("Hold food for 6 hours, offer small sips of water, and see a vet today if it continues.");
      await expect(answer).toBeEnabled({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await answer.click();

    await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}\/$/, { timeout: 20_000 });
    await expect(page.getByText("Quick help chat")).toBeVisible();
  });
});
