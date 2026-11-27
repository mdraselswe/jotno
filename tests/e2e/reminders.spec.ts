import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { localStackUp, signIn, sql } from "./helpers/local";

/**
 * Vaccine and visit reminders arrive as web push, so every place that promises
 * them asks for notifications, and says honestly where they can't work: iPhone
 * Safari before Add to Home Screen, Facebook/Messenger's in-app browser.
 * One test owner per project (sign-in codes for one email at once time out).
 */
const email = (project: string) => `e2e-remind-${project}@demo.jotno.test`;
const PET = "E2E Reminder Cat";

const IPHONE_UA = devices["iPhone 15"].userAgent;
const MESSENGER_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-A155F Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/142.0.0.0 Mobile Safari/537.36 [FB_IAB/MESSENGER;FBAV/480.0.0.0;]";

async function cleanUp(project: string) {
  const db = sql();
  try {
    await db`delete from auth.users where email = ${email(project)}`;
  } finally {
    await db.end();
  }
}

/** A signed-up, onboarded owner with one pet whose deworming is due tomorrow. Returns the pet's id. */
async function owner(project: string): Promise<string> {
  await cleanUp(project);
  const db = sql();
  try {
    const [u] = await db<{ id: string }[]>`
      insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data,
        confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at)
      values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        ${email(project)}, now(), '{"full_name":"E2E Reminder"}'::jsonb, '', '', '', '', now(), now())
      returning id`;
    if (!u) throw new Error("could not create the test owner");
    await db`update public.profiles set onboarded = true, locale = 'en' where id = ${u.id}`;
    const [p] = await db<{ id: string }[]>`
      insert into public.patients (owner_id, name) values (${u.id}, ${PET}) returning id`;
    if (!p) throw new Error("could not create the test pet");
    await db`
      insert into public.health_records (patient_id, kind, title, given_on, due_on)
      values (${p.id}, 'deworm', 'Deworming', (now() at time zone 'Asia/Dhaka')::date - 89,
        (now() at time zone 'Asia/Dhaka')::date + 1)`;
    return p.id;
  } finally {
    await db.end();
  }
}

/** The reminder ask on the page (not the install card or other regions). */
const prompt = (page: Page) => page.getByRole("region", { name: /^Turn on notifications/ });

type Session = Awaited<ReturnType<BrowserContext["storageState"]>>;

/** The same signed-in owner on another device (Supabase sends one code a minute per email). */
async function onDevice(browser: Browser, session: Session, path: string, userAgent: string) {
  const ctx = await browser.newContext({ storageState: session, userAgent });
  const page = await ctx.newPage();
  await page.goto(path);
  return { ctx, page };
}

// Full Chromium (new headless): the default headless shell always reports notifications as denied.
test.use({ channel: "chromium" });

test.describe("reminder notifications", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 });
  let petPath = "";
  let session: Session | undefined;
  test.beforeEach(async ({}, info) => {
    test.skip(!(await localStackUp()), "needs the local Supabase stack");
    if (!petPath) petPath = `/en/account/pets/${await owner(info.project.name)}/`;
  });
  test.afterAll(async ({}, info) => {
    if (await localStackUp()) await cleanUp(info.project.name);
  });

  test("a pet's health page asks for notifications, and a failed subscribe doesn't break it", async ({
    page,
  }, info) => {
    await signIn(page, email(info.project.name), petPath);
    await page.context().grantPermissions(["notifications"]);
    await page.goto(petPath);
    session = await page.context().storageState();
    const ask = prompt(page);
    // The ask waits for the service worker, which registers after the page has loaded.
    await expect(ask).toContainText("vaccine and deworming reminders: a week before, the day before", {
      timeout: 20_000,
    });
    const axe = await new AxeBuilder({ page }).include("main").analyze();
    expect(axe.violations).toEqual([]);

    // Playwright's Chromium has no push service, so subscribing fails: an error toast, not a crash.
    await ask.getByRole("button", { name: "Turn on" }).click();
    await expect(page.getByText("Couldn't turn on notifications.")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1, name: PET })).toBeVisible();

    // "Not now" hides it for a week, on every page.
    await ask.getByRole("button", { name: "Not now" }).click();
    await expect(ask).toHaveCount(0);
    await page.goto("/en/account/");
    await expect(page.getByText("Health reminders")).toBeVisible();
    await expect(prompt(page)).toHaveCount(0);
  });

  test("on iPhone Safari it explains Add to Home Screen instead of a button that can't work", async ({
    browser,
  }) => {
    test.skip(!session, "needs the signed-in session from the first test");
    const { ctx, page } = await onDevice(browser, session as Session, petPath, IPHONE_UA);
    try {
      const ask = prompt(page);
      await expect(ask).toContainText("Share → Add to Home Screen");
      await expect(ask.getByRole("button", { name: "Turn on" })).toHaveCount(0);

      await page.goto("/en/account/settings/");
      await expect(page.getByText("Share → Add to Home Screen")).toBeVisible();
      // The honest fallback: reminders still show in the app.
      await expect(page.getByText("still show on your account Overview")).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  test("inside Messenger it says to open a real browser", async ({ browser }) => {
    test.skip(!session, "needs the signed-in session from the first test");
    const { ctx, page } = await onDevice(browser, session as Session, "/en/account/settings/", MESSENGER_UA);
    try {
      await expect(page.getByText("don't work inside Facebook, Messenger")).toBeVisible();
      await expect(page.getByRole("switch")).toHaveCount(0);
    } finally {
      await ctx.close();
    }
  });

  test("settings has an on/off switch where push works", async ({ browser }) => {
    test.skip(!session, "needs the signed-in session from the first test");
    const ctx = await browser.newContext({ storageState: session });
    const page = await ctx.newPage();
    await page.goto("/en/account/settings/");
    await expect(page.getByRole("switch", { name: "Notifications on this device" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("Vaccine and visit reminders, vet replies and calls come as notifications"),
    ).toBeVisible();
    await ctx.close();
  });
});
