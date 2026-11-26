import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { nameKey } from "../../src/lib/bangla-name";
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
// Per project: each project's clean-up removes its own invite only, not the other's mid-test.
const inviteCode = (project: string) => `E2EINVITE${project === "mobile" ? "M" : "D"}`;
/** The throwaway vet of the BVC check test (removed with its auth user afterwards). */
const TWIN_EMAIL = "e2e-bvc-twin@demo.jotno.test";
/** The register test's vet and the BVC number the admin adds for it (above any real number). */
const MATCH_EMAIL = "e2e-bvc-match@demo.jotno.test";
const MATCH_BVC = "99001";
const NID_NAME = "মোঃ পরীক্ষা রহমান";

async function cleanUp(project: string) {
  const SUMMARY = summaryFor(project);
  const VET = people(project).vet;
  const db = sql();
  try {
    // The BVC check test’s throwaway vet (profile, vet and documents go with the auth user).
    await db`delete from auth.users where email = ${TWIN_EMAIL}`;
    // The register test's vet and the row the admin typed in.
    await db`delete from auth.users where email = ${MATCH_EMAIL}`;
    await db`delete from public.bvc_register where reg_key = ${MATCH_BVC}`;
    // The approval test: its invite, the reward it earned, its paid request.
    const invited = await db<{ referee_id: string }[]>`
      select referee_id from public.referrals where code = ${inviteCode(project)}`;
    for (const r of invited)
      await db`delete from public.points where ref_type = 'referral' and ref_id = ${r.referee_id}`;
    await db`delete from public.referrals where code = ${inviteCode(project)}`;
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
  // Sign-in waits for an emailed code, which is slow on a busy machine.
  test.describe.configure({ mode: "serial", timeout: 90_000 });
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
      await db`delete from public.referrals where code = ${inviteCode(info.project.name)}`;
      const [o] = await db<{ id: string }[]>`select id from public.profiles where email = ${OWNER}`;
      const [v] = await db<{ id: string }[]>`select id from public.profiles where email = ${INVITER}`;
      if (!o || !v) throw new Error("demo people missing");
      ownerId = o.id;
      const added = await db`
        insert into public.referrals (referee_id, referrer_id, code) values (${o.id}, ${v.id}, ${inviteCode(info.project.name)})
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

  test("the admin sees a duplicate BVC number and the ticked checks are logged", async ({ page }, info) => {
    // One admin account: only one project signs it in (and only this serial group, so codes don’t cross).
    test.skip(info.project.name !== "desktop", "the admin signs in from the desktop project only");
    // A throwaway vet (its own auth user) sent for review with Dr. Nusrat Jahan’s BVC-4000 in Bangla digits.
    const db = sql();
    let vetId = "";
    try {
      await db`delete from auth.users where email = ${TWIN_EMAIL}`;
      const [u] = await db<{ id: string }[]>`
        insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
        values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          ${TWIN_EMAIL}, '{"full_name":"E2E Twin"}'::jsonb, now(), now())
        returning id`;
      if (!u) throw new Error("could not create the test user");
      const [v] = await db<{ id: string }[]>`
        insert into public.providers (profile_id, status, slug, display_name, registration_no, submitted_at)
        values (${u.id}, 'pending', 'e2e-bvc-twin', 'Dr. E2E Twin', ${"বিভিসি ০৪০০০"}, now())
        returning id`;
      if (!v) throw new Error("could not create the test vet");
      vetId = v.id;
    } finally {
      await db.end();
    }

    await signIn(page, "admin@demo.jotno.test", `/en/admin/vets/${vetId}/`);
    await page.goto(`/en/admin/vets/${vetId}/`);
    const warning = page.getByRole("alert").filter({ hasText: "is also on another profile" });
    await expect(warning).toBeVisible();
    await expect(warning.getByRole("link", { name: "Dr. Nusrat Jahan" })).toBeVisible();

    // A tick before hydration is lost: tick until it holds.
    const certificate = page.getByRole("checkbox", { name: /name and number match this profile/ });
    const nid = page.getByRole("checkbox", { name: /name on the NID matches/ });
    for (const box of [certificate, nid]) {
      await expect(async () => {
        if (!(await box.isChecked())) await box.click();
        await expect(box).toBeChecked({ timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
    }
    await page.getByRole("button", { name: "Verify (BVC checked)" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Checked: 2 of 3.");
    await dialog.getByRole("button", { name: "Yes, verify" }).click();
    await expect(page.getByText("Checked: certificate, NID")).toBeVisible({ timeout: 15_000 });

    const check = sql();
    try {
      const [log] = await check<{ meta: { checks?: string[] } | null }[]>`
        select meta from public.audit_log
        where action = 'provider.verify' and entity_id = ${vetId}
        order by created_at desc limit 1`;
      expect(log?.meta?.checks).toEqual(["certificate", "nid"]);
    } finally {
      await check.end();
    }
  });

  test("an admin adds a vet to the BVC register and the profile shows the match", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "the admin signs in from the desktop project only");
    const db = sql();
    let vetId = "";
    try {
      await db`delete from auth.users where email = ${MATCH_EMAIL}`;
      await db`delete from public.bvc_register where reg_key = ${MATCH_BVC}`;
      const [u] = await db<{ id: string }[]>`
        insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
        values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          ${MATCH_EMAIL}, '{"full_name":"E2E Match"}'::jsonb, now(), now())
        returning id`;
      if (!u) throw new Error("could not create the test user");
      const [v] = await db<{ id: string }[]>`
        insert into public.providers
          (profile_id, status, slug, display_name, registration_no, name_nid_bn, name_nid_key, submitted_at)
        values (${u.id}, 'pending', 'e2e-bvc-match', 'Dr. E2E Match', ${`BVC-${MATCH_BVC}`},
          ${NID_NAME}, ${nameKey(NID_NAME)}, now())
        returning id`;
      if (!v) throw new Error("could not create the test vet");
      vetId = v.id;
    } finally {
      await db.end();
    }

    await signIn(page, "admin@demo.jotno.test", `/en/admin/vets/${vetId}/`);
    await page.goto(`/en/admin/vets/${vetId}/`);
    const card = page.locator("section").filter({ has: page.getByRole("heading", { name: "BVC register" }) });
    await expect(card.getByText("Not in the list", { exact: true })).toBeVisible();
    await page.goto("/en/admin/vets/?bvc=missing");
    // The list draws each vet twice (table on wide screens, cards on phones).
    await expect(page.getByRole("main").getByText("Dr. E2E Match").filter({ visible: true })).toBeVisible();

    // A registration notice: the admin types the new vet in (until the form is hydrated, retry).
    await page.goto("/en/admin/bvc/");
    await expect(async () => {
      await page.getByRole("textbox", { name: "BVC number", exact: true }).fill(MATCH_BVC);
      await page.getByLabel("Name (in Bangla, as BVC writes it)").fill("ডাঃ মোঃ পরীক্ষা রহমান");
      await page.getByRole("button", { name: "Save to register" }).click();
      await expect(page.getByText("Saved").first()).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    await page.goto(`/en/admin/bvc/?q=${MATCH_BVC}`);
    await expect(
      page.getByRole("main").getByText("ডাঃ মোঃ পরীক্ষা রহমান").filter({ visible: true }),
    ).toBeVisible();

    await page.goto(`/en/admin/vets/${vetId}/`);
    await expect(card.getByText("Name matches", { exact: true })).toBeVisible();
    await expect(card.getByText("ডাঃ মোঃ পরীক্ষা রহমান")).toBeVisible();
    await expect(card.getByText("Added by an admin")).toBeVisible();

    // The vets list badge and the "not in the list" filter agree.
    await page.goto("/en/admin/vets/?bvc=missing");
    await expect(page.getByRole("main").getByText("Dr. E2E Match")).toHaveCount(0);
    await page.goto("/en/admin/vets/?bvc=check");
    await expect(page.getByRole("main").getByText("Dr. E2E Match")).toHaveCount(0);
  });
});
