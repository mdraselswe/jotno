import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { localStackUp, openConsult, removeTestConsults, signIn } from "./helpers/local";

/**
 * A real WebRTC call between two signed-in people (owner and vet) in two
 * browser contexts, with Chrome's fake camera and microphone. Needs the local
 * Supabase stack (sign-in codes come from Mailpit).
 */
const OWNER = "owner@demo.jotno.test";
const VET = "arif@demo.jotno.test";

test.use({
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
});

/** The full-screen call view (not other dialogs such as the install card). */
const callScreen = (page: Page) => page.locator("[aria-labelledby=call-title]");

async function person(browser: Browser, email: string, path: string): Promise<BrowserContext> {
  const ctx = await browser.newContext({ permissions: ["microphone", "camera"] });
  const page = await ctx.newPage();
  await signIn(page, email, path);
  await page.goto(path);
  return ctx;
}

test.describe("calls inside a consult", () => {
  // They sign in the same demo people; two code requests for one email at once time out.
  test.describe.configure({ mode: "serial" });
  test.afterAll(async () => {
    if (await localStackUp()) await removeTestConsults();
  });
  test.skip(({ browserName }) => browserName !== "chromium", "fake media devices are Chromium-only");

  test("owner video-calls the vet, they talk, the vet hangs up", async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "one run is enough");
    test.skip(!(await localStackUp()), "local Supabase isn't running");
    test.setTimeout(120_000);

    const consultId = await openConsult(OWNER, VET);
    const path = `/en/chat/${consultId}/`;
    const ownerCtx = await person(browser, OWNER, path);
    const vetCtx = await person(browser, VET, path);
    const owner = ownerCtx.pages()[0];
    const vet = vetCtx.pages()[0];
    if (!owner || !vet) throw new Error("pages missing");

    // Both are on the private channel and see each other.
    await expect(owner.getByText(/is in the chat now/)).toBeVisible({ timeout: 20_000 });
    await expect(vet.getByText(/is in the chat now/)).toBeVisible({ timeout: 20_000 });

    await owner.getByRole("button", { name: "Video call" }).click();
    await expect(callScreen(owner)).toContainText(/Calling/, { timeout: 15_000 });

    const ring = callScreen(vet);
    await expect(ring).toContainText(/is calling/, { timeout: 15_000 });
    await vet.getByRole("button", { name: "Answer", exact: true }).click();

    // Connected: the timer runs on both sides.
    await expect(owner.locator("#call-status")).toHaveText(/^\d+:\d\d$/, { timeout: 30_000 });
    await expect(vet.locator("#call-status")).toHaveText(/^\d+:\d\d$/, { timeout: 30_000 });
    // Media actually flows: the vet receives the owner's (fake) camera.
    await expect
      .poll(
        () =>
          vet.evaluate(() => {
            const v = document.querySelector<HTMLVideoElement>(
              "[aria-labelledby=call-title] video:not([muted])",
            );
            return v ? v.videoWidth : 0;
          }),
        { timeout: 20_000 },
      )
      .toBeGreaterThan(0);

    await owner.getByRole("button", { name: "Mute microphone" }).click();
    await expect(owner.getByRole("button", { name: "Unmute microphone" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await owner.waitForTimeout(1500);
    await vet.getByRole("button", { name: "End call" }).click();
    await expect(callScreen(vet)).toBeHidden();
    await expect(callScreen(owner)).toBeHidden({ timeout: 10_000 });

    // The call leaves a line in both chats.
    await expect(owner.getByText(/Video call · \d+:\d\d/)).toBeVisible({ timeout: 10_000 });
    await expect(vet.getByText(/Video call · \d+:\d\d/)).toBeVisible({ timeout: 10_000 });

    await ownerCtx.close();
    await vetCtx.close();
  });

  test("an unanswered call can be declined and shows as declined", async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "one run is enough");
    test.skip(!(await localStackUp()), "local Supabase isn't running");
    test.setTimeout(120_000);

    const consultId = await openConsult(OWNER, VET);
    const path = `/en/chat/${consultId}/`;
    const ownerCtx = await person(browser, OWNER, path);
    const vetCtx = await person(browser, VET, path);
    const owner = ownerCtx.pages()[0];
    const vet = vetCtx.pages()[0];
    if (!owner || !vet) throw new Error("pages missing");
    await expect(vet.getByText(/is in the chat now/)).toBeVisible({ timeout: 20_000 });

    await vet.getByRole("button", { name: "Audio call" }).click();
    await expect(callScreen(owner)).toContainText(/is calling/, { timeout: 15_000 });
    await owner.getByRole("button", { name: "Decline" }).click();

    await expect(vet.getByText(/can't talk right now/)).toBeVisible({ timeout: 10_000 });
    await expect(owner.getByText("Audio call declined")).toBeVisible({ timeout: 10_000 });

    await ownerCtx.close();
    await vetCtx.close();
  });

  test("a stranger can't join the consult's channel", async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "one run is enough");
    test.skip(!(await localStackUp()), "local Supabase isn't running");
    const consultId = await openConsult(OWNER, VET);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await signIn(page, "rafiq@demo.jotno.test", `/en/chat/${consultId}/`);
    await page.goto(`/en/chat/${consultId}/`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/not found|doesn't exist/i);
    await ctx.close();
  });
});
