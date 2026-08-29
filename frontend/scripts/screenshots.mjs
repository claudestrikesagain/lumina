/**
 * Capture screenshots of every Lumina page. Assumes the Vite preview server
 * is running at http://localhost:4173 (default for `npm run preview`).
 *
 *   npm run build && npm run preview &
 *   node scripts/screenshots.mjs
 *
 * Outputs PNGs to ./screenshots/. Each page is captured at 1440x900.
 *
 * Honest caveat: this is headless Chromium with no wallet extension, so the
 * "Connect" CTAs are shown in their disconnected state. To get connected-state
 * screenshots, run locally with a real browser and Freighter installed.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const BASE = process.env.SCREENSHOT_BASE ?? "http://localhost:4173";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../screenshots");

const PAGES = [
  { path: "/", file: "01-landing.png" },
  { path: "/overview", file: "02-overview.png" },
  { path: "/wallet", file: "03-wallet.png" },
  { path: "/deposit", file: "04-deposit.png" },
  { path: "/notes", file: "05-notes.png" },
  { path: "/proof-lab", file: "06-proof-lab.png" },
  { path: "/compliance", file: "07-compliance.png" },
  { path: "/ledger", file: "08-ledger.png" },
  { path: "/developers", file: "09-developers.png" },
  { path: "/about", file: "10-about.png" },
];

// Mobile-width captures for one page, to show responsive behaviour.
const MOBILE = [
  { path: "/", file: "11-mobile-landing.png", width: 390, height: 844 },
  { path: "/proof-lab", file: "12-mobile-proof-lab.png", width: 390, height: 844 },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  for (const shot of [...PAGES, ...MOBILE]) {
    const ctx = await browser.newContext({
      viewport: { width: shot.width ?? 1440, height: shot.height ?? 900 },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();

    // Suppress wallet-kit warnings — there is no wallet extension in headless.
    page.on("pageerror", (err) => {
      console.warn(`[pageerror on ${shot.path}] ${err.message}`);
    });

    const url = `${BASE}${shot.path}`;
    console.log(`→ ${url}`);
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 20_000 });
      // Wait for the page heading (font-display) so animations have settled.
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(800);
      await page.screenshot({
        path: resolve(OUT, shot.file),
        fullPage: true,
      });
      console.log(`   saved ${shot.file}`);
    } catch (e) {
      console.error(`   FAILED ${shot.path}: ${e.message}`);
    }
    await ctx.close();
  }

  await browser.close();
  console.log(`\nDone. Output: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});