/**
 * Kasb v0.1 — Comprehensive browser demo recording
 * Covers all major user flows in the app.
 *
 * Scenes:
 *  1.  Sign in — phone number + OTP flow
 *  2.  Home dashboard — balance card, recent entries, bottom nav
 *  3.  Add a sale — hero button, numpad, category, description, confirm
 *  4.  Add an expense — expense hero button, numpad, category, confirm
 *  5.  Cashbook — today/week/month tabs, bar chart, entry list
 *  6.  Entry correction — open entry detail, correct it
 *  7.  WhatsApp receipt — share entry as WhatsApp message
 *  8.  Customer debt book — list, customer detail, add debt sale
 *  9.  Record repayment — mark debt as partially paid
 * 10.  Credit score — score ring, component bars, partner list
 * 11.  Credit application — tap "Apply" on partner, fill amount, consent
 * 12.  AE pathway — readiness quiz, simulation, mark step done
 * 13.  Stock tracker — item list, low-stock alert, sell item
 * 14.  Add stock item — open add sheet, fill in new product
 * 15.  Profile — view profile, push notifications opt-in
 */

import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ORIGIN = "http://localhost:4000";
const DOCS = resolve(__dirname, "../../docs");

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Click a button even if the fixed bottom nav partially covers it */
async function forceClick(locator) {
  await locator.scrollIntoViewIfNeeded();
  await pause(300);
  await locator.click({ force: true });
}

async function main() {
  console.log("🎬 Starting comprehensive Kasb demo...");

  // Clear OTP rate-limit records for the demo phone so multiple runs don't hit the 3/hr limit
  console.log("🗑️  Clearing OTP rate limit for demo user...");
  try {
    execSync(
      `docker exec terroir-postgresql psql -U kasb -d kasb -c "DELETE FROM otp_codes WHERE phone = '+212600000001';"`,
      { stdio: "pipe" },
    );
  } catch {
    // If docker exec fails (different setup), continue — OTP might still work
    console.log("   ⚠️  Could not clear OTP codes — proceeding anyway");
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 80, // slight slow-down for visual clarity
    args: ["--no-sandbox"],
  });

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "fr-FR",
    colorScheme: "light",
    recordVideo: { dir: DOCS, size: { width: 390, height: 844 } },
  });

  const page = await ctx.newPage();

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 1: Sign in — phone OTP
  // ─────────────────────────────────────────────────────────────────────────
  console.log("📱 Scene 1: Sign in");
  await page.goto(`${ORIGIN}/dz/signin`);
  await pause(2500);

  await page.fill('input[name="phone"]', "+212600000001");
  await pause(1000);
  await page.click('button[type="submit"]');

  // Wait for OTP input to appear (confirms the phone was accepted, not rate-limited)
  await page.locator('input[name="otp"]').waitFor({ state: "visible", timeout: 12000 });
  await pause(1000);

  await page.fill('input[name="otp"]', "123456");
  await pause(800);
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL(`${ORIGIN}/dz/home`, { timeout: 15000 });
  } catch {
    await page.waitForURL(`${ORIGIN}/dz/**`, { timeout: 10000 });
  }
  await pause(2500);

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 2: Home dashboard — balance + recent entries
  // ─────────────────────────────────────────────────────────────────────────
  console.log("🏠 Scene 2: Home dashboard");
  // Scroll down to show recent entries
  await page.evaluate(() => window.scrollBy(0, 200));
  await pause(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(1500);

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 3: Add a sale — income entry
  // ─────────────────────────────────────────────────────────────────────────
  console.log("💰 Scene 3: Add a sale (income)");
  const incomeBtn = page.locator("button").filter({ hasText: /بيع|income/i }).first();
  await incomeBtn.click();
  await pause(1500);

  // Numpad: 2000 MAD
  for (const digit of ["2", "0", "0", "0"]) {
    await page.locator(`button:has-text("${digit}")`).first().click();
    await pause(250);
  }
  await pause(800);

  // Add a description (placeholder text in dz locale is "ملاحظة (اختياري)")
  const descInput = page.locator('input[placeholder*="ملاحظة"]').first();
  if (await descInput.isVisible({ timeout: 1500 }).catch(() => false)) {
    await descInput.fill("خضرة");
    await pause(800);
  }

  const confirmSale = page
    .locator('button[type="button"]')
    .filter({ hasText: /تسجيل/ })
    .last();
  await forceClick(confirmSale);
  // Wait for the success banner or sheet to close (server round-trip can take ~2s)
  // Wait for save confirmation then navigate to home clean
  await page.locator("text=تم التسجيل").waitFor({ state: "visible", timeout: 6000 }).catch(() => {});
  await pause(1000);
  // Navigate to home to get a clean state (sheet fully closed, data refreshed)
  await page.goto(`${ORIGIN}/dz/home`);
  await page.waitForLoadState("networkidle");
  await pause(1500);

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 4: Add an expense
  // ─────────────────────────────────────────────────────────────────────────
  console.log("💸 Scene 4: Add an expense");
  const expenseBtn = page.locator("button").filter({ hasText: /خروج/ }).first();
  await expenseBtn.waitFor({ state: "visible", timeout: 8000 });
  await expenseBtn.click();
  await pause(1500);

  // Numpad: 500 MAD
  for (const digit of ["5", "0", "0"]) {
    await page.locator(`button:has-text("${digit}")`).first().click();
    await pause(250);
  }
  await pause(800);

  // Pick transport category
  const transportChip = page
    .locator('button[type="button"]')
    .filter({ hasText: /الترانسبور|transport/i })
    .first();
  if (await transportChip.isVisible({ timeout: 1500 }).catch(() => false)) {
    await transportChip.click();
    await pause(600);
  }

  const confirmExpense = page
    .locator('button[type="button"]')
    .filter({ hasText: /تسجيل/ })
    .last();
  await forceClick(confirmExpense);
  await page.locator("text=تم التسجيل").waitFor({ state: "visible", timeout: 6000 }).catch(() => {});
  await pause(1000);
  // Navigate to home clean before cashbook
  await page.goto(`${ORIGIN}/dz/home`);
  await page.waitForLoadState("networkidle");
  await pause(1500);

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 5: Cashbook — period tabs + chart
  // ─────────────────────────────────────────────────────────────────────────
  console.log("📒 Scene 5: Cashbook");
  await page.goto(`${ORIGIN}/dz/cashbook`);
  await pause(2500);

  // Switch period tabs: today → week → month
  for (const label of [/الأسبوع|Semaine/i, /الشهر|Mois/i]) {
    const tab = page.locator("button").filter({ hasText: label }).first();
    if (await tab.isVisible({ timeout: 1500 }).catch(() => false)) {
      await tab.click();
      await pause(1500);
    }
  }

  // Scroll to see chart + entries
  await page.evaluate(() => window.scrollBy(0, 300));
  await pause(2000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(1000);

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 6: Entry correction
  // ─────────────────────────────────────────────────────────────────────────
  console.log("✏️  Scene 6: Entry correction");
  // Click the first visible entry to open detail / correction
  const firstEntry = page.locator('[class*="rounded-2xl"][class*="border"]').first();
  if (await firstEntry.isVisible({ timeout: 2000 }).catch(() => false)) {
    await firstEntry.click();
    await pause(2000);

    // Look for correction button
    const correctBtn = page
      .locator('button[type="button"]')
      .filter({ hasText: /صحح|Corriger/i })
      .first();
    if (await correctBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await correctBtn.click();
      await pause(1500);
      // Change the amount — tap backspace then new digits
      const backspace = page.locator('button:has-text("⌫")').first();
      for (let i = 0; i < 4; i++) {
        await backspace.click();
        await pause(200);
      }
      for (const digit of ["1", "8", "0", "0"]) {
        await page.locator(`button:has-text("${digit}")`).first().click();
        await pause(200);
      }
      await pause(800);
      const confirmCorrect = page
        .locator('button[type="button"]')
        .filter({ hasText: /تسجيل/ })
        .last();
      await forceClick(confirmCorrect);
      await pause(2500);
    } else {
      // Close if no correction button
      await page.keyboard.press("Escape");
      await pause(500);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 7: WhatsApp receipt sharing
  // ─────────────────────────────────────────────────────────────────────────
  console.log("📲 Scene 7: WhatsApp receipt");
  // Find a share WhatsApp button or link
  const waBtn = page
    .locator('button, a')
    .filter({ hasText: /واتساب|WhatsApp/i })
    .first();
  if (await waBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await waBtn.scrollIntoViewIfNeeded();
    await pause(1000);
    // Just hover / highlight it — don't actually open WhatsApp
    await waBtn.hover();
    await pause(2000);
  } else {
    // Go to cashbook and look for it on an entry
    const firstEntryWA = page.locator('[class*="shareWhatsApp"], a[href*="wa.me"]').first();
    if (await firstEntryWA.isVisible({ timeout: 1500 }).catch(() => false)) {
      await firstEntryWA.scrollIntoViewIfNeeded();
      await firstEntryWA.hover();
      await pause(1500);
    }
  }
  await pause(1000);

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 8: Customer debt book — list + add a debt sale
  // ─────────────────────────────────────────────────────────────────────────
  console.log("👥 Scene 8: Customer debt book");
  await page.goto(`${ORIGIN}/dz/customers`);
  await pause(2500);

  // Open first customer
  const firstCustomer = page.locator('a[href*="/customers/"]').first();
  const hasCustomer = await firstCustomer.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasCustomer) {
    await firstCustomer.click();
    await pause(2500);

    // Scroll down to see history
    await page.evaluate(() => window.scrollBy(0, 250));
    await pause(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await pause(1000);

    // Tap "record debt sale" button
    const debtSaleBtn = page
      .locator('button[type="button"]')
      .filter({ hasText: /بيع بالدين|Vente à crédit/i })
      .first();
    if (await debtSaleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await debtSaleBtn.click();
      await pause(1500);

      // Fill amount
      const debtAmtInput = page.locator('input[inputmode="decimal"], input[type="number"], input[placeholder*="درهم"]').first();
      if (await debtAmtInput.isVisible({ timeout: 1500 }).catch(() => false)) {
        await debtAmtInput.fill("250");
      }
      await pause(800);

      const confirmDebt = page
        .locator('button[type="button"]')
        .filter({ hasText: /تسجيل البيع|Enregistrer la vente/i })
        .last();
      await forceClick(confirmDebt);
      await pause(2500);
    }
    await page.goBack();
    await pause(1000);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 9: Record repayment
  // ─────────────────────────────────────────────────────────────────────────
  console.log("💳 Scene 9: Record repayment");
  if (hasCustomer) {
    await firstCustomer.click().catch(() => {});
    await pause(2000);

    const repayBtn = page
      .locator('button[type="button"]')
      .filter({ hasText: /خلاص دين|Remboursement/i })
      .first();
    if (await repayBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await repayBtn.click();
      await pause(1500);

      const repayAmtInput = page.locator('input[inputmode="decimal"], input[type="number"], input[placeholder*="درهم"]').first();
      if (await repayAmtInput.isVisible({ timeout: 1500 }).catch(() => false)) {
        await repayAmtInput.fill("100");
      }
      await pause(800);

      const confirmRepay = page
        .locator('button[type="button"]')
        .filter({ hasText: /تسجيل الخلاص|Enregistrer le remboursement/i })
        .last();
      await forceClick(confirmRepay);
      await pause(2500);
    }
    await page.goBack().catch(() => {});
    await pause(800);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 10: Credit score — ring + components + partners
  // ─────────────────────────────────────────────────────────────────────────
  console.log("⭐ Scene 10: Credit score");
  await page.goto(`${ORIGIN}/dz/credit`);
  await pause(3000);

  // Scroll slowly through score components
  await page.evaluate(() => window.scrollBy(0, 200));
  await pause(1500);
  await page.evaluate(() => window.scrollBy(0, 250));
  await pause(2000);
  await page.evaluate(() => window.scrollBy(0, 250));
  await pause(2000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(1000);

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 11: Credit application — apply to a partner
  // ─────────────────────────────────────────────────────────────────────────
  console.log("🏦 Scene 11: Credit application");
  const applyBtn = page
    .locator('button[type="button"]')
    .filter({ hasText: /قدم الطلب|Faire une demande/i })
    .first();
  if (await applyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await applyBtn.scrollIntoViewIfNeeded();
    await pause(800);
    await applyBtn.click({ force: true });
    await pause(2000);

    // Fill requested amount
    const amountInput = page.locator('input[placeholder*="المبلغ"], input[placeholder*="درهم"], input[inputmode="decimal"]').first();
    if (await amountInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      await amountInput.fill("5000");
      await pause(1000);

      // Confirm (consent is built-in to the action)
      const confirmApply = page
        .locator('button[type="button"]')
        .filter({ hasText: /تأكيد الطلب|Confirmer la demande/i })
        .last();
      await forceClick(confirmApply);
      await pause(3000);
    } else {
      await page.keyboard.press("Escape");
      await pause(500);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 12: AE pathway — steps + simulation + mark done
  // ─────────────────────────────────────────────────────────────────────────
  console.log("🏛  Scene 12: AE pathway");
  await page.goto(`${ORIGIN}/dz/ae`);
  await pause(3000);

  // Show income simulation
  await page.evaluate(() => window.scrollBy(0, 200));
  await pause(1500);

  // Scroll to steps
  await page.evaluate(() => window.scrollBy(0, 250));
  await pause(1500);

  // Mark first step "done" if available
  const markDoneBtn = page
    .locator('button[type="button"]')
    .filter({ hasText: /تم$|^تم/ })
    .first();
  if (await markDoneBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await markDoneBtn.click({ force: true });
    await pause(2000);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(800);

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 13: Stock tracker — list + sell item
  // ─────────────────────────────────────────────────────────────────────────
  console.log("📦 Scene 13: Stock tracker");
  await page.goto(`${ORIGIN}/dz/stock`);
  await pause(2500);

  // Scroll to see any items
  await page.evaluate(() => window.scrollBy(0, 200));
  await pause(1500);

  // Tap "Record sale" on the first item
  const sellBtn = page
    .locator('button[type="button"]')
    .filter({ hasText: /سجل بيع|Enregistrer une vente/i })
    .first();
  if (await sellBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await sellBtn.click();
    await pause(1500);

    const confirmSell = page
      .locator('button[type="button"]')
      .filter({ hasText: /تأكيد|Confirmer/i })
      .last();
    if (await confirmSell.isVisible({ timeout: 1500 }).catch(() => false)) {
      await confirmSell.click({ force: true });
      await pause(2500);
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(800);

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 14: Add a new stock item
  // ─────────────────────────────────────────────────────────────────────────
  console.log("➕ Scene 14: Add stock item");
  const addItemBtn = page
    .locator('button[type="button"]')
    .filter({ hasText: /زيد منتوج|Ajouter un article/i })
    .first();
  if (await addItemBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await addItemBtn.click();
    await pause(1500);

    // Fill in product name
    const nameInput = page.locator('input[placeholder*="مثلاً"], input[placeholder*="Ex:"]').first();
    if (await nameInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      await nameInput.fill("زيت الزيتون");
      await pause(600);
    }

    // Fill unit
    const unitInput = page.locator('input').nth(1);
    await unitInput.fill("litre").catch(() => {});
    await pause(500);

    // Close sheet without saving (demo purposes)
    await page.keyboard.press("Escape");
    await pause(1000);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene 15: Profile page
  // ─────────────────────────────────────────────────────────────────────────
  console.log("👤 Scene 15: Profile page");
  await page.goto(`${ORIGIN}/dz/profile`);
  await pause(2500);

  // Scroll to show all quick links including push notifications
  await page.evaluate(() => window.scrollBy(0, 300));
  await pause(2000);

  // Show push notification toggle
  const pushBtn = page
    .locator('button[type="button"]')
    .filter({ hasText: /إشعارات|Notifications/i })
    .first();
  if (await pushBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await pushBtn.scrollIntoViewIfNeeded();
    await pause(1000);
    await pushBtn.hover();
    await pause(1500);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(1500);

  // ─────────────────────────────────────────────────────────────────────────
  // Outro — navigate back home to show the full app
  // ─────────────────────────────────────────────────────────────────────────
  console.log("🏠 Outro: back to home");
  await page.goto(`${ORIGIN}/dz/home`);
  await pause(3000);

  console.log("🎬 Recording complete.");
  await pause(1000);

  await ctx.close();
  await browser.close();

  // ─── Convert WebM → MP4 ──────────────────────────────────────────────────
  const videos = readdirSync(DOCS).filter((f) => f.endsWith(".webm"));
  if (videos.length === 0) {
    console.error("❌ No WebM file found in", DOCS);
    process.exit(1);
  }

  // Pick the most-recently-modified .webm using statSync for accurate mtime
  const { statSync } = await import("node:fs");
  const latest = videos
    .map((f) => {
      try {
        return { f, t: statSync(join(DOCS, f)).mtimeMs };
      } catch {
        return { f, t: 0 };
      }
    })
    .sort((a, b) => b.t - a.t)[0].f;

  const webmPath = join(DOCS, latest);
  const mp4Path = join(DOCS, "kasb-demo.mp4");

  console.log(`🎞  Converting ${latest} → kasb-demo.mp4 ...`);
  execSync(
    `ffmpeg -y -i "${webmPath}" -c:v libx264 -preset fast -crf 20 -vf "scale=390:844" -c:a aac "${mp4Path}"`,
    { stdio: "inherit" },
  );

  console.log(`✅ Done — ${mp4Path}`);
}

main().catch((e) => {
  console.error("❌ Recording failed:", e);
  process.exit(1);
});
