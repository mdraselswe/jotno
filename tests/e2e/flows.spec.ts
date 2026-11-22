import { expect, test } from "@playwright/test";

/**
 * Public flows against the demo seed (CI starts a local Supabase and runs
 * `pnpm db:env`, which sets NEXT_PUBLIC_DEMO=true and manual payments).
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

  test("filter links change the results on default-locale pages (client navigation)", async ({ page }) => {
    // Regression: with a next.config rewrite for unprefixed URLs, the router
    // reused the first page's payload for every ?species= link.
    await page.goto("/questions/");
    const filters = page.locator("main nav").first();
    for (const species of ["dog", "cat"]) {
      await filters.locator(`a[href$='species=${species}']`).click();
      await expect(page).toHaveURL(new RegExp(`species=${species}`));
      await expect(filters.locator(`a[href$='species=${species}']`)).toHaveClass(/bg-primary/);
    }
    await page.goto("/shop/");
    await page.locator("main a[href$='category=toys']").first().click();
    await expect(page).toHaveURL(/category=toys/);
    await expect(page.locator("main a[href$='category=toys']").first()).toHaveAttribute(
      "aria-current",
      "page",
    );
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

  test("shop filters, search and sort work together", async ({ page }) => {
    await page.goto("/en/shop/");
    const count = page.locator("main p[aria-live]");
    await expect(count).toContainText(/\d+ products/);
    // On phones the filters fold away behind a button.
    const show = page.getByRole("button", { name: "Show filters" });
    if (await show.isVisible()) await show.click();
    await page.getByRole("checkbox", { name: /^Food/ }).check();
    await expect(page).toHaveURL(/category=food/);
    await page.getByRole("searchbox").fill("cat");
    await page.getByRole("searchbox").press("Enter");
    await expect(page).toHaveURL(/q=cat/);
    await expect(page).toHaveURL(/category=food/);
    await expect(count).toContainText(/results for “cat”/);
    await page.locator("select[name=sort]").selectOption("price_asc");
    await expect(page).toHaveURL(/sort=price_asc/);
    // Every filter that is on can be removed from its chip.
    await page.getByRole("link", { name: /Remove filter: “cat”/ }).click();
    await expect(page).not.toHaveURL(/q=cat/);
    await expect(page).toHaveURL(/category=food/);
  });

  test("a gateway callback can't mark a manual payment paid", async ({ request }) => {
    const res = await request.get(
      "/api/pay/return/?value_a=00000000-0000-0000-0000-000000000000&amount=100&status=VALID",
      { maxRedirects: 0 },
    );
    expect(res.status()).toBe(303);
    expect(res.headers().location ?? "").toContain("payment=unknown");
  });

  test("cron needs the secret", async ({ request }) => {
    const res = await request.post("/api/cron/frequent/");
    expect(res.status()).toBe(401);
  });
});
