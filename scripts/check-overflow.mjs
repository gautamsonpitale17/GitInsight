import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const VIEWPORTS = [1024, 1280, 1366, 1440, 1536, 1920];
const PATHS = ["/", "/about", "/torvalds"];

const browser = await chromium.launch({ headless: true });
const failures = [];

for (const width of VIEWPORTS) {
  for (const path of PATHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      await page.goto(`${BASE}${path}`, {
        waitUntil: "load",
        timeout: 30_000,
      });
      await page.waitForTimeout(path === "/torvalds" ? 4000 : 1000);

      const result = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const scrollWidth = Math.max(
          doc.scrollWidth,
          body.scrollWidth,
          doc.offsetWidth,
        );
        const clientWidth = doc.clientWidth;
        const overflowPx = scrollWidth - clientWidth;

        const offenders = [];
        for (const el of document.querySelectorAll("body *")) {
          const rect = el.getBoundingClientRect();
          if (rect.width <= 0) continue;
          if (rect.right > clientWidth + 1 || rect.left < -1) {
            offenders.push({
              tag: el.tagName.toLowerCase(),
              className: el.className?.toString?.().slice(0, 80) ?? "",
              width: Math.round(rect.width),
              right: Math.round(rect.right),
              left: Math.round(rect.left),
            });
          }
        }
        offenders.sort((a, b) => b.width - a.width);

        return {
          scrollWidth,
          clientWidth,
          overflowPx,
          hasOverflow: overflowPx > 1,
          topOffenders: offenders.slice(0, 5),
        };
      });

      const label = `${width}px ${path}`;
      if (result.hasOverflow) {
        failures.push(
          `${label}: horizontal overflow ${result.overflowPx}px (scroll ${result.scrollWidth} vs client ${result.clientWidth})`,
        );
        console.log(`FAIL ${label}`, result.topOffenders);
      } else {
        console.log(`OK   ${label}`);
      }
    } catch (error) {
      failures.push(`${width}px ${path}: ${error.message}`);
      console.log(`ERR  ${width}px ${path}: ${error.message}`);
    } finally {
      await page.close();
    }
  }
}

await browser.close();

if (failures.length > 0) {
  console.error("\nOverflow failures:");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log("\nAll viewport checks passed — no horizontal scrollbar.");
