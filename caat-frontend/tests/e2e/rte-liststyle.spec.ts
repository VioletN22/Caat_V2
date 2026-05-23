/**
 * #9 List/bullet styling — choose the bullet character / number style; it
 * carries into the editor, preview, and printed PDF.
 */
import { test, expect } from "@playwright/test";

async function openFreeEditor(page: import("@playwright/test").Page) {
  await page.goto("/resume-builder");
  await page.getByRole("button", { name: "Education", exact: true }).first().click();
  await page.getByRole("button", { name: /free text/i }).first().click();
  const editor = page.locator(".ProseMirror").first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  return editor;
}

function previewList(page: import("@playwright/test").Page, sel: string) {
  return page.locator(`.resume-preview-content ${sel}`).filter({ visible: true });
}

test("bullet list -> square marker in editor + preview", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 950 });
  const editor = await openFreeEditor(page);
  await page.keyboard.type("First point");
  await page.getByRole("button", { name: "Bullet list", exact: true }).click();
  await page.keyboard.press("Enter");
  await page.keyboard.type("Second point");
  // List style dropdown is now enabled.
  const listStyle = page.getByRole("button", { name: "List style", exact: true });
  await expect(listStyle).toBeEnabled();
  await listStyle.click();
  await page.getByRole("menuitem", { name: /Square/ }).click();
  await page.waitForTimeout(1200);

  await expect(editor.locator('ul[style*="list-style-type: square"]')).toHaveCount(1, { timeout: 5_000 });
  // Preview splits each li into its own ul; both should carry the style.
  await expect(previewList(page, 'ul[style*="list-style-type: square"]').first()).toBeVisible();

  await page.screenshot({ path: "/tmp/liststyle-bullet.png", fullPage: false });
});

test("numbered list -> lower-alpha marker", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 950 });
  const editor = await openFreeEditor(page);
  await page.keyboard.type("Alpha");
  await page.getByRole("button", { name: "Numbered list", exact: true }).click();
  await page.keyboard.press("Enter");
  await page.keyboard.type("Beta");
  const listStyle = page.getByRole("button", { name: "List style", exact: true });
  await listStyle.click();
  await page.getByRole("menuitem", { name: /Letter/ }).first().click();
  await page.waitForTimeout(1200);
  await expect(editor.locator('ol[style*="list-style-type: lower-alpha"]')).toHaveCount(1, { timeout: 5_000 });
  await expect(previewList(page, 'ol[style*="list-style-type: lower-alpha"]').first()).toBeVisible();

  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(400);
  await page.pdf({ path: "/tmp/liststyle.pdf", format: "A4", printBackground: true });
});

test("List style is disabled when not in a list", async ({ page }) => {
  await openFreeEditor(page);
  await page.keyboard.type("Just a paragraph");
  await expect(page.getByRole("button", { name: "List style", exact: true })).toBeDisabled();
});
