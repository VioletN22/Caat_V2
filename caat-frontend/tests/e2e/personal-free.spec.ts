/**
 * Personal section supports a Free Text mode that renders the student's own
 * content in the top header slot, replacing the structured contact header.
 */
import { test, expect } from "@playwright/test";

const CUSTOM = "CUSTOMHEADERXYZ";

function previewText(page: import("@playwright/test").Page, text: string) {
  return page.getByText(text, { exact: false }).filter({ visible: true });
}

test("Personal free mode renders a custom header; guided restores the contact line", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 950 });
  await page.goto("/resume-builder");
  await page.getByRole("button", { name: "Personal Information", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Free Text", exact: true }).first()).toBeVisible({ timeout: 10_000 });

  // Free mode: clear + type a custom header.
  await page.getByRole("button", { name: "Free Text", exact: true }).first().click();
  const editor = page.locator(".ProseMirror").first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.type(CUSTOM);
  await page.waitForTimeout(1500);

  // Custom header is published; the structured fallback name is gone.
  await expect(previewText(page, CUSTOM).first()).toBeVisible();
  await expect(previewText(page, "JOHN DOE")).toHaveCount(0);

  await page.screenshot({ path: "/tmp/personal-free-preview.png", fullPage: false });
  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(400);
  await page.pdf({ path: "/tmp/personal-free.pdf", format: "A4", printBackground: true });
  await page.emulateMedia({ media: "screen" });

  // Back to Guided: structured contact line returns, custom header gone.
  await page.getByRole("button", { name: "Guided", exact: true }).first().click();
  await page.waitForTimeout(1500);
  await expect(previewText(page, CUSTOM)).toHaveCount(0);
  // The contact line uses bullet separators between email/phone/etc.
  await expect(previewText(page, "•").first()).toBeVisible();

  // Back to Free: the custom header survived.
  await page.getByRole("button", { name: "Free Text", exact: true }).first().click();
  await expect(page.locator(".ProseMirror").first()).toContainText(CUSTOM);
  await page.waitForTimeout(1200);
  await expect(previewText(page, CUSTOM).first()).toBeVisible();
});
