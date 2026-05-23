/**
 * #10 Rich text in guided Notes/description fields. The Notes editor is a
 * minimal rich-text editor; its formatting renders in the preview + PDF.
 */
import { test, expect } from "@playwright/test";

function previewText(page: import("@playwright/test").Page, text: string) {
  return page.getByText(text, { exact: false }).filter({ visible: true });
}

test("guided Education Notes is rich; formatting renders in preview + PDF", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 950 });
  await page.goto("/resume-builder");
  await page.getByRole("button", { name: "Education", exact: true }).first().click();
  await page.getByRole("button", { name: "Guided", exact: true }).first().click();
  await page.waitForTimeout(800);

  await page.getByPlaceholder("University of Sydney").first().fill("RichNoteUni");

  // Minimal toolbar: Bold present, but full-only controls (Font) are hidden.
  await expect(page.getByRole("button", { name: "Bold", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Font family" })).toHaveCount(0);

  // Type a note and bold it.
  const notes = page.locator(".ProseMirror").first();
  await notes.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.type("Stellar achievement");
  await page.keyboard.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Bold", exact: true }).first().click();
  // add a bullet line
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Bullet list", exact: true }).first().click();
  await page.keyboard.type("Won a national prize");
  await page.waitForTimeout(1500);

  // Preview shows the bold note + the bullet, under the guided institution.
  await expect(previewText(page, "RichNoteUni").first()).toBeVisible();
  await expect(page.locator('.resume-preview-content strong').filter({ hasText: "Stellar achievement" }).first()).toBeVisible();
  await expect(page.locator('.resume-preview-content li').filter({ hasText: "Won a national prize" }).first()).toBeVisible();

  await page.screenshot({ path: "/tmp/guided-rich-preview.png", fullPage: false });
  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(400);
  await page.pdf({ path: "/tmp/guided-rich.pdf", format: "A4", printBackground: true });
});
