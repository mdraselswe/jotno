import { expect, test } from "@playwright/test";

/**
 * Public flows against the demo seed (CI starts a local Supabase and runs
 * `pnpm db:env`, which sets NEXT_PUBLIC_DEMO=true and the mock gateway).
 */
test.describe("public flows", () => {
  test("search → vet profile → sign-in gate for a paid chat", async ({ page }) => {
    await page.goto("/vets/");
    const firstVet = page.locator("main a[href*='/vet/']").first();
    await expect(firstVet).toBeVisible();
    await firstVet.click();
    await expect(page).toHaveURL(/\/vet\/[a-z0-9-]+\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const chat = page.locator("main a[href$='/consult/']").first();
    await chat.click();
    await expect(page).toHaveURL(/\/consult\/$/);
    // Signed out: a sign-in link that comes back here.
    const signIn = page.locator("main a[href*='/login/?next=']");
    await expect(signIn).toBeVisible();
  });

  test("private pages send signed-out people to sign in", async ({ page }) => {
    for (const path of ["/account/", "/dashboard/", "/admin/"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\/\?next=/);
    }
  });

  test("a question page and the shop cart work signed out", async ({ page }) => {
    await page.goto("/questions/");
    const q = page.locator("main a[href*='/questions/']").filter({ hasNotText: /^$/ }).nth(1);
    if (await q.count()) {
      await q.click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    await page.goto("/shop/");
    const add = page.getByRole("button", { name: /add to cart|কার্টে যোগ/i }).first();
    await add.click();
    await page.goto("/shop/cart/");
    await expect(page.locator("main a[href*='/shop/']").first()).toBeVisible();
  });

  test("cron needs the secret", async ({ request }) => {
    const res = await request.post("/api/cron/frequent/");
    expect(res.status()).toBe(401);
  });
});
