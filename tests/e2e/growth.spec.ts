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
const INVITE_CODE = "E2EINVITE";

async function cleanUp(project: string) {
  const SUMMARY = summaryFor(project);
  const VET = people(project).vet;
  const db = sql();
  try {
    // The approval test: its invite, the reward it earned, its paid request.
    const invited = await db<{ referee_id: string }[]>`
      select referee_id from public.referrals where code = ${INVITE_CODE}`;
    for (const r of invited)
      await db`delete from public.points where ref_type = 'referral' and ref_id = ${r.referee_id}`;
    await db`delete from public.referrals where code = ${INVITE_CODE}`;
    const approved = await db<{ id: string; payment_id: string | null }[]>`
      select id, payment_id from public.quick_requests where summary = ${`${SUMMARY} (approve)`}`;
    await db`delete from public.quick_requests where summary = ${`${SUMMARY} (approve)`}`;
    const approvedPayments = approved.flatMap((r) => (r.payment_id ? [r.payment_id] : []));
    if (approvedPayments.length > 0) {
      await db`delete from public.ledger_entries where payment_id in ${db(approvedPayments)}`;
      await db`delete from public.payments where id in ${db(approvedPayments)}`;
    }
    const consults = await db<{ id: string }[]>`select id from public.consults where summary = ${SUMMARY}`;
    const ids = consults.map((c) => c.id);
    const requests = await db<{ id: string; payment_id: string | null }[]>`
      select id, payment_id from public.quick_requests where summary = ${SUMMARY}`;
    const payments = requests.flatMap((r) => (r.payment_id ? [r.payment_id] : []));
    if (ids.length > 0) await db`delete from public.ledger_entries where ref_id in ${db(ids)}`;
    await db`delete from public.quick_requests where summary = ${SUMMARY}`;
    // A paid request's ledger lines point at its payment too.
    if (payments.length > 0) {
      await db`delete from public.ledger_entries where payment_id in ${db(payments)}`;
      await db`delete from public.payments where id in ${db(payments)}`;
    }
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
    // Clear first: React ignores a fill that matches the value it saw at hydration.
    await expect(async () => {
      const box = card.getByLabel("Your answer");
      await box.fill("");
      await box.fill(
        "Hold food for 6 hours, offer small sips of water, and see a vet today if it continues.",
      );
      await expect(answer).toBeEnabled({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await answer.click();

    await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}\/$/, { timeout: 20_000 });
    await expect(page.getByText("Quick help chat")).toBeVisible();
  });

  test("an admin approves an invited owner's first payment and the inviter is rewarded", async ({
    page,
  }, info) => {
    // One admin account: only one project signs it in.
    test.skip(info.project.name !== "desktop", "the admin signs in from the desktop project only");
    const { owner: OWNER, vet: INVITER } = people(info.project.name);
    const TRX = "E2EAPPROVE1";
    const db = sql();
    let paymentId = "";
    let ownerId = "";
    try {
      await db`delete from public.referrals where code = ${INVITE_CODE}`;
      const [o] = await db<{ id: string }[]>`select id from public.profiles where email = ${OWNER}`;
      const [v] = await db<{ id: string }[]>`select id from public.profiles where email = ${INVITER}`;
      if (!o || !v) throw new Error("demo people missing");
      ownerId = o.id;
      const added = await db`
        insert into public.referrals (referee_id, referrer_id, code) values (${o.id}, ${v.id}, ${INVITE_CODE})
        on conflict (referee_id) do nothing returning referee_id`;
      test.skip(added.length === 0, "this owner already came through a real invite");
      const [q] = await db<{ id: string }[]>`
        insert into public.quick_requests (owner_id, summary, fee, commission)
        values (${o.id}, ${`${summaryFor(info.project.name)} (approve)`}, 9900, 2900) returning id`;
      if (!q) throw new Error("could not create a quick-help request");
      const [p] = await db<{ id: string }[]>`
        insert into public.payments (user_id, purpose, ref_id, amount, gateway, status, gateway_tx_id, payer_phone, submitted_at)
        values (${o.id}, 'quick', ${q.id}, 9900, 'manual', 'review', ${`bkash:${TRX}`}, '01700000000', now())
        returning id`;
      if (!p) throw new Error("could not create its payment");
      paymentId = p.id;
      await db`update public.quick_requests set payment_id = ${p.id} where id = ${q.id}`;
    } finally {
      await db.end();
    }

    await signIn(page, "admin@demo.jotno.test", "/en/admin/payments/");
    await page.goto("/en/admin/payments/");
    const row = page.locator("main li").filter({ hasText: TRX });
    await row.getByRole("button", { name: "Found it, approve" }).click();
    // Approving used to crash on the referral reward (a Date inside raw SQL).
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Something went wrong")).toHaveCount(0);

    const check = sql();
    try {
      const [pay] = await check<
        { status: string }[]
      >`select status from public.payments where id = ${paymentId}`;
      expect(pay?.status).toBe("paid");
      const [ref] = await check<{ paid: boolean }[]>`
        select first_paid_at is not null as paid from public.referrals where referee_id = ${ownerId}`;
      expect(ref?.paid).toBe(true);
    } finally {
      await check.end();
    }
  });
});
