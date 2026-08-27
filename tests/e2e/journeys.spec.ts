import { expect, test } from "@playwright/test";

test("explore search and legal pages render", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByRole("heading", { name: /explore/i })).toBeVisible();
  await page.goto("/search?q=interest");
  await expect(page.getByRole("heading", { name: /search/i })).toBeVisible();
  await page.goto("/legal/privacy");
  await expect(page.getByRole("heading", { name: /privacy/i })).toBeVisible();
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
});
