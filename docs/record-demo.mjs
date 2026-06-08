/**
 * Kasb v0.1 — Full browser demo recording script
 * Playwright records a WebM video of the complete user flow,
 * then ffmpeg converts it to MP4.
 *
 * Scenes:
 *  1. Sign in (phone OTP)
 *  2. Home screen — balance card + recent entries
 *  3. Add a sale (numpad entry)
 *  4. Cashbook — period tabs + chart
 *  5. Customer debt book
 *  6. Credit score dashboard
 *  7. AE (Auto-Entrepreneur) pathway
 *  8. Stock tracker
 *  9. Profile + notifications opt-in
 */

import { chromium } from "playwright";
import { execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ORIGIN = "http://localhost:4000";
// Output to docs/ folder (two levels up from apps/web where this script now lives)
const DOCS = resolve(__dirname, "../../docs");

async function pause(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("🎬 Starting Kasb demo recording...");

  const browser = await chromium.launch({
    headless: false, // visible window for recording
    args: ["--no-sandbox"],
  });

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro — mobile-first
    locale: "fr-FR",
    colorScheme: "light",
    recordVideo: {
      dir: DOCS,
      size: { width: 390, height: 844 },
    },
  });

  const page = await ctx.newPage();

  // ── Scene 1: Sign in ──────────────────────────────────────────────────────
  console.log("📱 Scene 1: Sign in");
  await page.goto(`${ORIGIN}/dz/signin`);
  await pause(2500);

  await page.fill('input[name="phone"]', "+212600000001");
  await pause(1200);
  await page.click('button[type="submit"]');
  await pause(2500);

  // OTP step
  await page.fill('input[name="otp"]', "123456");
  await pause(1000);
  await page.click('button[type="submit"]');

  // Wait for redirect to home
  try {
    await page.waitForURL(`${ORIGIN}/dz/home`, { timeout: 15000 });
  } catch {
    await page.waitForURL(`${ORIGIN}/dz/**`, { timeout: 10000 });
  }
  await pause(3000);

  // ── Scene 2: Home screen ──────────────────────────────────────────────────
  console.log("🏠 Scene 2: Home screen");
  await pause(2000);

  // ── Scene 3: Add a sale ───────────────────────────────────────────────────
  console.log("💰 Scene 3: Add a sale");
  // Click the income (+) hero button
  const incomeBtn = page.locator('button').filter({ hasText: /بيع|Vente|income/i }).first();
  await incomeBtn.click();
  await pause(1500);

  // Type 1500 on the numpad (1, 5, 0, 0)
  for (const digit of ["1", "5", "0", "0"]) {
    await page.locator(`button:has-text("${digit}")`).first().click();
    await pause(300);
  }
  await pause(1000);

  // Confirm the entry (button text contains the amount "15 MAD")
  const confirmBtn = page.locator('button[type="button"]').filter({ hasText: /تسجيل|Enregistrer/i }).last();
  await confirmBtn.click();
  await pause(3000);

  // ── Scene 4: Cashbook ──────────────────────────────────────────────────────
  console.log("📒 Scene 4: Cashbook");
  await page.goto(`${ORIGIN}/dz/cashbook`);
  await pause(2500);

  // Click "month" tab
  const monthTab = page.locator('button').filter({ hasText: /الشهر|Mois/i }).first();
  if (await monthTab.isVisible()) {
    await monthTab.click();
    await pause(2000);
  }

  // ── Scene 5: Customers ────────────────────────────────────────────────────
  console.log("👥 Scene 5: Customer debt book");
  await page.goto(`${ORIGIN}/dz/customers`);
  await pause(2500);

  // Click on first customer if any
  const firstCustomer = page.locator('a[href*="/customers/"]').first();
  if (await firstCustomer.isVisible({ timeout: 2000 }).catch(() => false)) {
    await firstCustomer.click();
    await pause(2500);
    await page.goBack();
    await pause(1000);
  }

  // ── Scene 6: Credit score ─────────────────────────────────────────────────
  console.log("⭐ Scene 6: Credit score");
  await page.goto(`${ORIGIN}/dz/credit`);
  await pause(3000);

  // Scroll down to see partners
  await page.evaluate(() => window.scrollBy(0, 400));
  await pause(2000);
  await page.evaluate(() => window.scrollBy(0, -400));
  await pause(1000);

  // ── Scene 7: AE Pathway ───────────────────────────────────────────────────
  console.log("🏛 Scene 7: AE pathway");
  await page.goto(`${ORIGIN}/dz/ae`);
  await pause(3000);

  // Scroll down to see steps
  await page.evaluate(() => window.scrollBy(0, 300));
  await pause(2000);

  // ── Scene 8: Stock tracker ────────────────────────────────────────────────
  console.log("📦 Scene 8: Stock tracker");
  await page.goto(`${ORIGIN}/dz/stock`);
  await pause(2500);

  // ── Scene 9: Profile ──────────────────────────────────────────────────────
  console.log("👤 Scene 9: Profile");
  await page.goto(`${ORIGIN}/dz/profile`);
  await pause(3000);

  // Final pause before close
  console.log("🎬 Wrapping up...");
  await pause(2000);

  await ctx.close();
  await browser.close();

  // ── Convert WebM → MP4 ────────────────────────────────────────────────────
  const videos = readdirSync(DOCS).filter((f) => f.endsWith(".webm"));
  if (videos.length === 0) {
    console.error("❌ No WebM video found in", DOCS);
    process.exit(1);
  }

  const latest = videos
    .map((f) => ({ f, t: new Date(readdirSync(DOCS, { withFileTypes: true }).find((e) => e.name === f)?.name || 0).getTime() }))
    .sort((a, b) => b.t - a.t)[0].f;

  const webmPath = join(DOCS, latest);
  const mp4Path = join(DOCS, "kasb-demo.mp4");

  console.log(`🎞  Converting ${latest} → kasb-demo.mp4`);
  execSync(
    `ffmpeg -y -i "${webmPath}" -c:v libx264 -preset fast -crf 22 -c:a aac "${mp4Path}"`,
    { stdio: "inherit" }
  );

  console.log(`✅ Video saved: ${mp4Path}`);
}

main().catch((e) => {
  console.error("❌ Recording failed:", e);
  process.exit(1);
});
