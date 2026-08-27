import { expect, test } from "@playwright/test";

const sandboxOrigin =
  process.env.SANDBOX_ORIGIN ?? process.env.NEXT_PUBLIC_SANDBOX_ORIGIN ?? "http://127.0.0.1:3001";

test("sandbox origin is distinct and iframe cannot access parent", async ({ page, request }) => {
  const health = await request.get(`${sandboxOrigin}/health`);
  expect(health.ok(), await health.text()).toBeTruthy();
  const payload = (await health.json()) as { service?: string };
  expect(payload.service).toBe("oriel-sandbox");

  const appDenied = await request.get("/sandbox/00000000-0000-4000-8000-000000000000");
  expect(appDenied.status()).toBe(404);
  expect(await appDenied.text()).toMatch(/SANDBOX_ORIGIN|not from the application origin/i);

  await page.goto("/learn/stack-vs-queue");
  const frame = page.locator("main article iframe[sandbox='allow-scripts']");
  await expect(frame).toHaveCount(1, { timeout: 15_000 });
  await expect(frame).toHaveAttribute("sandbox", "allow-scripts");
  const sandboxAttr = await frame.getAttribute("sandbox");
  expect(sandboxAttr).not.toMatch(/allow-same-origin/);
  expect(sandboxAttr).not.toMatch(/allow-forms|allow-popups|allow-top-navigation/);
  const src = await frame.getAttribute("src");
  expect(src).toContain(new URL(sandboxOrigin).host);
  expect(src).not.toContain(":3000/");

  const mismatched = new URL(src ?? sandboxOrigin);
  mismatched.searchParams.set("parent", "https://evil.example");
  const denied = await request.get(mismatched.toString());
  expect(denied.ok()).toBeTruthy();
  const deniedHtml = await denied.text();
  expect(deniedHtml).not.toContain("https://evil.example");
  expect(deniedHtml).toMatch(/sandbox-runtime\.js\?parent=/);
  const csp = denied.headers()["content-security-policy"] ?? "";
  expect(csp).toMatch(/frame-ancestors/);
  expect(csp).not.toContain("evil.example");

  const isolated = await page.evaluate(() => {
    const iframe = document.querySelector("main article iframe");
    if (!(iframe instanceof HTMLIFrameElement)) return { present: false, parentDom: "missing" };
    let parentDom = "blocked";
    try {
      parentDom = iframe.contentDocument ? "leaked" : "blocked";
    } catch {
      parentDom = "blocked";
    }
    return { present: true, parentDom };
  });
  expect(isolated.parentDom).toBe("blocked");

  const handle = await frame.elementHandle();
  const content = handle ? await handle.contentFrame() : null;
  expect(content, "Playwright CDP can attach; page JS still cannot").not.toBeNull();
  if (!content) return;

  const cookie = await content.evaluate(() => {
    try {
      return document.cookie || "";
    } catch {
      return "blocked";
    }
  });
  expect(cookie === "" || cookie === "blocked").toBeTruthy();

  const parentStorage = await content.evaluate(() => {
    try {
      return window.parent.localStorage.getItem("oriel") ?? "readable";
    } catch {
      return "blocked";
    }
  });
  expect(parentStorage).toBe("blocked");

  const parentTitle = await content.evaluate(() => {
    try {
      return window.parent.document.title;
    } catch {
      return "blocked";
    }
  });
  expect(parentTitle).toBe("blocked");

  const networked = await content.evaluate(async () => {
    try {
      const res = await fetch("https://example.invalid", { method: "GET" });
      return `status:${res.status}`;
    } catch {
      return "blocked";
    }
  });
  expect(networked).toBe("blocked");

  const envProbe = await content.evaluate(() => {
    try {
      return JSON.stringify((window as unknown as { process?: { env?: unknown } }).process?.env ?? null);
    } catch {
      return "blocked";
    }
  });
  expect(envProbe === "null" || envProbe === "blocked").toBeTruthy();
});
