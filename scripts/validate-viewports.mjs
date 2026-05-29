import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const USER = process.env.AUDIT_USER ?? "torvalds";
const VIEWPORTS = [1024, 1280, 1366, 1440, 1536, 1920];
const PAGES = ["/", "/about", `/${USER}`];
const SCREENSHOT_DIR = path.join(process.cwd(), "scripts", ".validation-screenshots");

const browser = await chromium.launch({ headless: true });
const failures = [];

await mkdir(SCREENSHOT_DIR, { recursive: true });

async function screenshot(page, name) {
  const file = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function loadDashboard(page) {
  await page.goto(`${BASE}/${USER}`, {
    waitUntil: "load",
    timeout: 60_000,
  });
  await page.waitForSelector(".dashboard-grid [data-wide], .dashboard-grid [data-narrow]", {
    timeout: 90_000,
  });
  await page.waitForTimeout(3000);
}

for (const width of VIEWPORTS) {
  for (const pagePath of PAGES) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      colorScheme: "light",
    });
    const label = `${width}px ${pagePath}`;

    try {
      if (pagePath.includes(USER)) {
        await loadDashboard(page);
      } else {
        await page.goto(`${BASE}${pagePath}`, {
          waitUntil: "load",
          timeout: 60_000,
        });
        await page.waitForTimeout(1500);
      }

      const result = await page.evaluate(() => {
        const doc = document.documentElement;
        const clientWidth = doc.clientWidth;
        const scrollWidth = Math.max(doc.scrollWidth, document.body.scrollWidth);
        const hasHorizontalScroll = scrollWidth - clientWidth > 1;

        const hOffenders = [];
        for (const el of document.querySelectorAll("body *")) {
          const rect = el.getBoundingClientRect();
          if (rect.width <= 0) continue;
          if (rect.right > clientWidth + 1 || rect.left < -1) {
            hOffenders.push({
              tag: el.tagName.toLowerCase(),
              cls: (el.className?.toString?.() ?? "").slice(0, 70),
              right: Math.round(rect.right),
            });
          }
        }

        const header = document.querySelector("header");
        const navRow = header?.querySelector(".gh-container");
        const navbarWrap =
          navRow &&
          navRow.getBoundingClientRect().height > 70 &&
          getComputedStyle(navRow).flexWrap !== "nowrap";

        const sidebar = document.querySelector(".dashboard-sidebar");
        const sidebarVisible =
          sidebar &&
          getComputedStyle(sidebar).display !== "none" &&
          sidebar.getBoundingClientRect().width >= 200;

        let sidebarSticky = null;
        if (sidebar && sidebarVisible) {
          const cs = getComputedStyle(sidebar);
          window.scrollTo(0, 1200);
          const after = sidebar.getBoundingClientRect().top;
          window.scrollTo(0, 0);
          const expected = parseFloat(cs.top) || 0;
          sidebarSticky = {
            works: cs.position === "sticky" && Math.abs(after - expected) < 4,
          };
        }

        const statRow = document.querySelector(
          ".print-section.grid.min-w-0.grid-cols-2",
        );
        let statCardsOneRow = null;
        if (statRow) {
          const kids = [...statRow.children].filter(
            (c) => c.getBoundingClientRect().width > 0,
          );
          const tops = kids.map((c) => Math.round(c.getBoundingClientRect().top));
          statCardsOneRow = {
            count: kids.length,
            works: kids.length >= 4 && [...new Set(tops)].length === 1,
          };
        }

        const heatmap = document.querySelector(".heatmap-scroll-container");
        let heatmapOk = null;
        if (heatmap) {
          heatmapOk = heatmap.scrollWidth <= heatmap.clientWidth + 2;
        }

        const gridCards = [
          ...document.querySelectorAll(
            ".dashboard-grid [data-wide], .dashboard-grid [data-narrow]",
          ),
        ].map((el) => ({
          title: el.querySelector("h2")?.textContent?.trim()?.slice(0, 24),
          wide: el.hasAttribute("data-wide"),
          narrow: el.hasAttribute("data-narrow"),
          w: Math.round(el.getBoundingClientRect().width),
          top: Math.round(el.getBoundingClientRect().top),
          col: getComputedStyle(el).gridColumn,
        }));

        let gridOk = null;
        if (gridCards.length >= 4) {
          const wideRows = gridCards.filter((c) => c.wide && c.w > 0);
          const narrowRows = gridCards.filter((c) => c.narrow && c.w > 0);
          const paired = wideRows.some((w) =>
            narrowRows.some(
              (n) => Math.abs(n.top - w.top) < 8 && n.w > 0 && n.w < w.w * 0.7,
            ),
          );
          const stackedWrong = wideRows.some((w) =>
            narrowRows.some(
              (n) => Math.abs(n.top - w.top) < 8 && Math.abs(n.w - w.w) < 20,
            ),
          );
          gridOk = {
            paired,
            stackedWrong,
            works: paired && !stackedWrong,
            cards: gridCards,
          };
        }

        const timelineTimes = document.querySelectorAll(
          ".dashboard-main time.gh-stat-number",
        );
        let timelineOk = null;
        if (timelineTimes.length > 0) {
          let off = 0;
          for (const t of timelineTimes) {
            const r = t.getBoundingClientRect();
            if (r.right > clientWidth + 1 || r.width < 4) off++;
          }
          timelineOk = { works: off === 0, count: timelineTimes.length };
        }

        const cardOverflow = [];
        for (const el of document.querySelectorAll(
          ".dashboard-grid [data-wide], .dashboard-grid [data-narrow], .dashboard-grid .col-span-1",
        )) {
          const rect = el.getBoundingClientRect();
          if (rect.width < 80 || rect.height < 40) continue;
          if (el.scrollWidth > el.clientWidth + 2 && rect.right > clientWidth + 1) {
            cardOverflow.push((el.querySelector("h2")?.textContent ?? "card").slice(0, 24));
          }
        }

        const chartLabels = [];
        for (const el of document.querySelectorAll(".recharts-cartesian-axis-tick text")) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > clientWidth + 1 || r.left < -1)) {
            chartLabels.push(el.textContent?.trim()?.slice(0, 16) ?? "?");
          }
        }

        return {
          hasHorizontalScroll,
          hOffenders: hOffenders.slice(0, 3),
          navbarWrap,
          sidebarVisible,
          sidebarSticky,
          statCardsOneRow,
          heatmapOk,
          gridOk,
          timelineOk,
          cardOverflow,
          chartLabels: chartLabels.slice(0, 5),
        };
      });

      const checks = [];

      if (result.hasHorizontalScroll) {
        checks.push({
          id: "horizontal-scroll",
          component: "page",
          detail: JSON.stringify(result.hOffenders),
        });
      }

      if (pagePath.includes(USER)) {
        if (result.navbarWrap) {
          checks.push({ id: "navbar-wrap", component: "Navbar" });
        }
        if (!result.sidebarVisible) {
          checks.push({ id: "sidebar-visible", component: "dashboard-sidebar" });
        }
        if (result.sidebarSticky && !result.sidebarSticky.works) {
          checks.push({ id: "sidebar-sticky", component: "dashboard-sidebar" });
        }
        if (result.statCardsOneRow && !result.statCardsOneRow.works) {
          checks.push({
            id: "stat-cards-row",
            component: "StatCards",
            detail: JSON.stringify(result.statCardsOneRow),
          });
        }
        if (result.heatmapOk === false) {
          checks.push({ id: "heatmap-overflow", component: "ContributionHeatmap" });
        }
        if (result.gridOk && !result.gridOk.works) {
          checks.push({
            id: "grid-8-4",
            component: "dashboard-grid",
            detail: JSON.stringify(result.gridOk),
          });
        }
        if (result.timelineOk && !result.timelineOk.works) {
          checks.push({
            id: "timeline-time",
            component: "ActivityTimeline",
            detail: JSON.stringify(result.timelineOk),
          });
        }
        if (result.cardOverflow.length > 0) {
          checks.push({
            id: "card-text-overflow",
            component: "dashboard cards",
            detail: result.cardOverflow.join(", "),
          });
        }
        if (result.chartLabels.length > 0) {
          checks.push({
            id: "chart-labels",
            component: "charts",
            detail: result.chartLabels.join(", "),
          });
        }
      }

      if (checks.length > 0) {
        const shot = await screenshot(
          page,
          `${width}-${pagePath.replace(/\//g, "_")}-fail`,
        );
        for (const c of checks) {
          failures.push({ viewport: width, page: pagePath, ...c, screenshot: shot });
        }
        console.log(`FAIL ${label}`, checks.map((c) => c.id).join(", "));
      } else {
        console.log(`OK   ${label}`);
      }
    } catch (error) {
      failures.push({
        viewport: width,
        page: pagePath,
        id: "error",
        component: "page",
        detail: error.message,
      });
      console.log(`ERR  ${label}: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  // Dark mode
  const darkPage = await browser.newPage({
    viewport: { width, height: 900 },
    colorScheme: "dark",
  });
  try {
    await loadDashboard(darkPage);
    await darkPage.evaluate(() => document.documentElement.classList.add("dark"));
    await darkPage.waitForTimeout(500);

    const dark = await darkPage.evaluate(() => {
      const issues = [];
      for (const el of document.querySelectorAll(
        ".dashboard-main p, .dashboard-main span, .dashboard-main time, .dashboard-main h2, .dashboard-main h3, .dashboard-sidebar p, .dashboard-sidebar span",
      )) {
        const s = getComputedStyle(el);
        if (s.display === "none" || s.visibility === "hidden") continue;
        const text = (el.textContent ?? "").trim();
        if (!text || text.length > 120) continue;
        const fg = s.color;
        const bg = s.backgroundColor;
        const fgL = fg.match(/\d+/g)?.map(Number) ?? [];
        const bgL = bg.match(/\d+/g)?.map(Number) ?? [];
        if (fgL.length >= 3 && bgL.length >= 3) {
          const contrast = Math.abs(fgL[0] - bgL[0]) + Math.abs(fgL[1] - bgL[1]) + Math.abs(fgL[2] - bgL[2]);
          if (contrast < 15 && bg !== "rgba(0, 0, 0, 0)") {
            issues.push({ text: text.slice(0, 24), fg, bg });
          }
        }
      }
      return issues.slice(0, 5);
    });

    if (dark.length > 0) {
      const shot = await screenshot(darkPage, `${width}-dark-fail`);
      failures.push({
        viewport: width,
        page: `/${USER} (dark)`,
        id: "dark-mode-contrast",
        component: "theme",
        detail: JSON.stringify(dark),
        screenshot: shot,
      });
      console.log(`FAIL ${width}px dark mode`);
    } else {
      console.log(`OK   ${width}px dark mode`);
    }

    // Focus ring
    await darkPage.keyboard.press("Tab");
    await darkPage.waitForTimeout(150);
    const focus = await darkPage.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return { works: false };
      const s = getComputedStyle(el);
      const hasRing =
        (s.outlineWidth !== "0px" && s.outlineStyle !== "none") ||
        s.boxShadow.includes("rgb");
      return { works: hasRing, tag: el.tagName };
    });
    if (!focus.works) {
      failures.push({
        viewport: width,
        page: `/${USER}`,
        id: "focus-ring",
        component: "interactive",
        detail: JSON.stringify(focus),
      });
      console.log(`FAIL ${width}px focus ring`);
    } else {
      console.log(`OK   ${width}px focus ring`);
    }

    const tooltipIssues = [];

    try {
      const heatmapSection = darkPage.locator(".heatmap-scroll-container").first();
      if ((await heatmapSection.count()) > 0) {
        await heatmapSection.scrollIntoViewIfNeeded();
      }
      const heatmapCell = darkPage.locator("rect[data-day]").nth(20);
      if ((await heatmapCell.count()) > 0) {
        await heatmapCell.hover({ force: true });
        await darkPage.waitForTimeout(250);
        const heatmapTip = await darkPage.evaluate(() => {
          const tip = [...document.querySelectorAll('[role="tooltip"]')].find((el) => {
            const s = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return s.opacity !== "0" && r.width > 0 && r.height > 0;
          });
          if (!tip) return { ok: false, reason: "heatmap tooltip missing" };
          const r = tip.getBoundingClientRect();
          const vw = document.documentElement.clientWidth;
          const vh = window.innerHeight;
          const ok =
            r.width > 0 &&
            r.height > 0 &&
            r.left >= -2 &&
            r.top >= -2 &&
            r.right <= vw + 2 &&
            r.bottom <= vh + 2;
          return { ok, rect: { l: r.left, r: r.right, t: r.top, b: r.bottom } };
        });
        if (!heatmapTip.ok) {
          tooltipIssues.push({
            component: "ContributionHeatmap",
            detail: JSON.stringify(heatmapTip),
          });
        }
        await darkPage.mouse.move(8, 8);
        await darkPage.waitForTimeout(150);
      }
    } catch (err) {
      tooltipIssues.push({
        component: "ContributionHeatmap",
        detail: err.message,
      });
    }

    try {
      const hourChart = darkPage.locator("[data-hour-chart]").first();
      if ((await hourChart.count()) > 0) {
        await hourChart.scrollIntoViewIfNeeded();
        const hourCell = hourChart.locator("rect").nth(12);
        if ((await hourCell.count()) > 0) {
          await hourCell.hover({ force: true });
          await darkPage.waitForTimeout(400);
          const chartTip = await darkPage.evaluate(() => {
            const tip = [...document.querySelectorAll('[role="tooltip"]')].find((el) => {
              const s = getComputedStyle(el);
              const r = el.getBoundingClientRect();
              return s.opacity !== "0" && r.width > 0 && r.height > 0;
            });
            if (!tip) return { ok: false, reason: "chart tooltip missing" };
            const r = tip.getBoundingClientRect();
            const vw = document.documentElement.clientWidth;
            const vh = window.innerHeight;
            const ok =
              r.width > 0 &&
              r.height > 0 &&
              r.left >= -2 &&
              r.top >= -2 &&
              r.right <= vw + 2 &&
              r.bottom <= vh + 2;
            return { ok, rect: { l: r.left, r: r.right, t: r.top, b: r.bottom } };
          });
          if (!chartTip.ok) {
            tooltipIssues.push({
              component: "CommitsByHour",
              detail: JSON.stringify(chartTip),
            });
          }
        }
      }
    } catch (err) {
      tooltipIssues.push({
        component: "CommitsByHour",
        detail: err.message,
      });
    }

    if (tooltipIssues.length > 0) {
      const shot = await screenshot(darkPage, `${width}-tooltip-fail`);
      for (const issue of tooltipIssues) {
        failures.push({
          viewport: width,
          page: `/${USER}`,
          id: "tooltip-clip",
          component: issue.component,
          detail: issue.detail,
          screenshot: shot,
        });
      }
      console.log(`FAIL ${width}px tooltips`);
    } else {
      console.log(`OK   ${width}px tooltips`);
    }
  } catch (e) {
    failures.push({
      viewport: width,
      page: `/${USER} dark/focus`,
      id: "error",
      detail: e.message,
    });
  } finally {
    await darkPage.close();
  }
}

await browser.close();

const reportPath = path.join(process.cwd(), "scripts", "validation-report.json");
await writeFile(
  reportPath,
  JSON.stringify({ failures, passed: failures.length === 0, ranAt: new Date().toISOString() }, null, 2),
);

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s). Report: ${reportPath}`);
  for (const f of failures) {
    console.error(
      `  [${f.viewport}px] ${f.page} — ${f.component} (${f.id}): ${f.detail ?? ""}`,
    );
    if (f.screenshot) console.error(`    screenshot: ${f.screenshot}`);
  }
  process.exit(1);
}

console.log(`\nAll ${VIEWPORTS.length} viewport checks passed. Report: ${reportPath}`);
