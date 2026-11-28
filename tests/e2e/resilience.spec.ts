import { expect, test } from "@playwright/test";

/**
 * On some networks the host's HTTP/3 stalls one request for ~45 s while the
 * others arrive. The service worker (scripts/sw.template.js) gives up on a
 * file that hasn't started answering in 8 s, asks again, and reports it
 * (src/lib/client-issue.ts → the server log).
 */
test("the service worker asks again for a file that stalls, and reports it", async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.goto("/about/");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  const reports: string[] = [];
  await context.route("**/api/client-issue/", async (route) => {
    reports.push(route.request().postData() ?? "");
    await route.continue();
  });
  // A file the worker hasn't saved yet (the query makes it new); the first request hangs.
  const file = "/images/pets/goat-400.webp?stall-test";
  let tries = 0;
  await context.route(`**${file}`, async (route) => {
    tries += 1;
    if (tries === 1) {
      await new Promise((resolve) => setTimeout(resolve, 20_000));
      await route.continue().catch(() => undefined); // the worker gave up on it already
      return;
    }
    await route.continue();
  });

  const result = await page.evaluate(async (path) => {
    const started = performance.now();
    const res = await fetch(path);
    return { ok: res.ok, ms: Math.round(performance.now() - started) };
  }, file);

  expect(result.ok).toBe(true);
  expect(tries).toBe(2);
  expect(result.ms).toBeLessThan(15_000);
  await expect.poll(() => reports.join("\n")).toContain('"kind":"asset-retry"');
});

test("the client issue endpoint takes valid reports only", async ({ request }) => {
  const ok = await request.post("/api/client-issue/", { data: { kind: "slow-load", path: "/", ms: 9000 } });
  expect(ok.status()).toBe(204);
  const bad = await request.post("/api/client-issue/", { data: { kind: "nope" } });
  expect(bad.status()).toBe(400);
});
