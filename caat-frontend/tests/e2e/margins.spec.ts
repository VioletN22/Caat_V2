/**
 * Resume-level page margins. Changing the preset updates the page padding and
 * re-paginates; the same value flows into the printed PDF.
 */
import { test, expect } from "@playwright/test";

async function setMargin(page: import("@playwright/test").Page, name: string) {
  await page.getByRole("combobox", { name: "Page margins" }).first().click();
  const opt = page.getByRole("option", { name });
  await expect(opt).toBeVisible();
  await opt.click();
  await page.waitForTimeout(900);
}

test("margins preset changes page padding (preview re-paginates)", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 950 });
  await page.goto("/resume-builder");
  await expect(page.getByRole("combobox", { name: "Page margins" }).first()).toBeVisible({ timeout: 10_000 });
  const pageEl = page.locator(".resume-page").first();
  await expect(pageEl).toBeVisible({ timeout: 10_000 });
  // Let the async resume load (which sets settings) fully settle before we
  // change margins, otherwise the load can reset our selection.
  await page.waitForTimeout(1800);

  await setMargin(page, "Wide");
  await expect(pageEl).toHaveCSS("padding", "92px");
  await page.screenshot({ path: "/tmp/margin-wide.png", fullPage: false });

  await setMargin(page, "Narrow");
  await expect(pageEl).toHaveCSS("padding", "48px");
  await page.screenshot({ path: "/tmp/margin-narrow.png", fullPage: false });
  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(400);
  await page.pdf({ path: "/tmp/margin-narrow.pdf", format: "A4", printBackground: true });
  await page.emulateMedia({ media: "screen" });

  await setMargin(page, "Normal");
  await expect(pageEl).toHaveCSS("padding", "68px");
});
