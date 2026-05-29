import { mkdir } from "node:fs/promises";
import path from "node:path";
import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { width: 1024, height: 768, name: "laptop-sm" },
  { width: 1280, height: 800, name: "laptop-md" },
  { width: 1440, height: 900, name: "desktop" },
  { width: 1920, height: 1080, name: "full-hd" },
] as const;

const SCREENSHOT_DIR = path.join(process.cwd(), "tests", "screenshots");

test.beforeAll(async () => {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
});

for (const vp of VIEWPORTS) {
  test(`dashboard layout — ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/torvalds", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    try {
      await page.waitForLoadState("networkidle", { timeout: 30_000 });
    } catch {
      // Next.js dev streams data indefinitely; fall through once dashboard markers exist.
    }

    await expect(page.getByTestId("dashboard-sidebar")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId("profile-tab-nav")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId("dashboard-grid")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId("heatmap-container")).toBeVisible({ timeout: 90_000 });

    const overflowPx = await page.evaluate(() => {
      const clientWidth = document.documentElement.clientWidth;
      const scrollWidth = Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      );
      return scrollWidth - clientWidth;
    });
    expect(overflowPx).toBeLessThanOrEqual(1);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(vp.width + 1);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${vp.name}.png`),
      fullPage: false,
    });
  });
}
