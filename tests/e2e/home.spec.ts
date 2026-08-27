import { expect, test } from "@playwright/test";

test("landing and feed routes render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /window that lets in light/i })).toBeVisible();
  await page.goto("/home");
  await expect(page.getByRole("navigation", { name: /primary/i }).first()).toBeVisible();
});
