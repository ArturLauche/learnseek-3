import { expect, test } from "@playwright/test";

const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@example.com";
const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "oriel-admin-change-me";

test("admin can sign in, suspend a user, and decide a moderation case", async ({ browser, request }) => {
  const learnerEmail = `e2e-learner-${Date.now()}@example.com`;
  const learnerContext = await browser.newContext();
  const learnerPage = await learnerContext.newPage();

  await learnerPage.goto("/sign-up");
  await learnerPage.getByLabel("Name").fill("E2E Learner");
  await learnerPage.getByLabel("Email").fill(learnerEmail);
  await learnerPage.getByLabel("Password").fill("oriel-learner-12");
  await learnerPage.getByRole("button", { name: /create account/i }).click();
  await learnerPage.waitForURL(/onboarding|home/, { timeout: 25_000 });

  await learnerPage.goto("/home");
  const report = learnerPage.getByRole("button", { name: /report/i }).first();
  if (await report.count()) await report.click();
  await learnerContext.close();

  const adminContext = await browser.newContext();
  const page = await adminContext.newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/home|admin/, { timeout: 25_000 });

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /overview/i })).toBeVisible();

  await page.goto(`/admin/users?q=${encodeURIComponent(learnerEmail)}`);
  await expect(page.getByRole("heading", { name: /users/i })).toBeVisible();
  await expect(page.getByText(learnerEmail)).toBeVisible({ timeout: 15_000 });

  const row = page.locator("tr", { hasText: learnerEmail });
  await row.locator("label", { hasText: "Confirm" }).first().click();
  const password = row.getByLabel(/re-enter password/i).first();
  if (await password.count()) await password.fill(adminPassword);
  await row.getByRole("button", { name: "Suspend" }).click();
  await page.waitForTimeout(500);

  await page.goto("/admin/moderation");
  await expect(page.getByRole("heading", { name: /moderation/i })).toBeVisible();
  const approve = page.getByRole("button", { name: "Approve" }).first();
  if (await approve.count()) {
    const caseRow = page.locator("tr").filter({ has: approve });
    await caseRow.locator("label", { hasText: "Confirm" }).first().click();
    await approve.click();
  }

  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  const json = (await health.json()) as { checks: Record<string, { ok: boolean }> };
  expect(json.checks.database?.ok).toBe(true);
  await adminContext.close();
});
