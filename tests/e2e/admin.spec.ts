import { expect, test } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@example.com";
const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "oriel-admin-change-me";

test("admin can sign in, suspend a user, and decide a moderation case", async ({ page, request }) => {
  const learnerEmail = `e2e-learner-${Date.now()}@example.com`;
  const signUp = await request.post("/api/auth/sign-up/email", {
    data: { email: learnerEmail, password: "oriel-learner-12", name: "E2E Learner" },
  });
  expect(signUp.ok(), await signUp.text()).toBeTruthy();

  const feed = await request.get("/api/feed");
  expect(feed.ok()).toBeTruthy();
  const payload = (await feed.json()) as { items?: { item: { id: string } }[] };
  const itemId = payload.items?.[0]?.item.id;
  if (itemId) {
    const report = await request.post("/api/reports", {
      data: { contentItemId: itemId, category: "spam", details: "e2e report for moderation" },
    });
    expect(report.ok()).toBeTruthy();
  }

  const login = await page.request.post("/api/auth/sign-in/email", {
    data: { email: adminEmail, password: adminPassword },
  });
  expect(login.ok(), await login.text()).toBeTruthy();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /overview/i })).toBeVisible();

  await page.goto(`/admin/users?q=${encodeURIComponent(learnerEmail)}`);
  await expect(page.getByRole("heading", { name: /users/i })).toBeVisible();
  await expect(page.getByText(learnerEmail).first()).toBeVisible({ timeout: 15_000 });

  const row = page.locator("tr", { hasText: learnerEmail }).first();
  const suspendForm = row.locator("form").filter({ has: page.getByRole("button", { name: "Suspend" }) });
  await suspendForm.locator("label", { hasText: "Confirm" }).click();
  const password = suspendForm.getByLabel(/re-enter password/i);
  if (await password.count()) await password.fill(adminPassword);
  await suspendForm.getByRole("button", { name: "Suspend" }).click();
  await expect(suspendForm.getByText("Recorded.")).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await expect(page.getByText(learnerEmail).first()).toBeVisible();
  await expect(page.locator("tr", { hasText: learnerEmail }).first().getByText("suspended")).toBeVisible();

  await page.goto("/admin/moderation");
  await expect(page.getByRole("heading", { name: /moderation/i })).toBeVisible();
  const approve = page.getByRole("button", { name: "Approve" }).first();
  if (await approve.count()) {
    const caseRow = page.locator("tr").filter({ has: approve }).first();
    const approveForm = caseRow.locator("form").filter({ has: page.getByRole("button", { name: "Approve" }) });
    await approveForm.locator("label", { hasText: "Confirm" }).click();
    await approveForm.getByRole("button", { name: "Approve" }).click();
    await expect(approveForm.getByText("Recorded.")).toBeVisible({ timeout: 10_000 });
  } else {
    await expect(page.getByText(/no cases yet|moderation/i).first()).toBeVisible();
  }

  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  const json = (await health.json()) as { checks: Record<string, { ok: boolean }> };
  expect(json.checks.database?.ok).toBe(true);
  expect(json.checks.origins?.ok).toBe(true);
  expect(json.checks.semanticSearch?.ok).toBe(true);
});
