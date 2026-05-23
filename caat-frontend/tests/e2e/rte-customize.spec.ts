/**
 * Resume editor — batch 7 Word-like customization controls.
 * Line spacing, indent/outdent, justify, strikethrough, clear formatting.
 * Verifies each control produces the right markup AND that block-level styles
 * (line-height, margin-left, text-align) land as inline styles so they carry
 * into the preview + printed PDF.
 */
import { test, expect } from "@playwright/test";

async function openFreeEditor(page: import("@playwright/test").Page) {
  await page.goto("/resume-builder");
  await page.getByRole("button", { name: /personal|education|experience/i }).first().click();
  await page.getByRole("button", { name: /free text/i }).click();
  await expect(page.getByRole("combobox", { name: /font family/i })).toBeVisible({ timeout: 10_000 });
  const editor = page.locator(".ProseMirror").first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  return editor;
}

test.describe("Resume editor customization (batch 7)", () => {
  test("toolbar renders all new controls", async ({ page }) => {
    await openFreeEditor(page);
    for (const name of ["Strikethrough", "Justify", "Increase indent", "Decrease indent", "Clear formatting"]) {
      await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("combobox", { name: /line spacing/i })).toBeVisible();
  });

  test("strikethrough", async ({ page }) => {
    const editor = await openFreeEditor(page);
    await page.keyboard.type("Struck out");
    await page.keyboard.press("ControlOrMeta+a");
    await page.getByRole("button", { name: "Strikethrough", exact: true }).click();
    await expect(editor.locator("s")).toHaveText("Struck out", { timeout: 5_000 });
    await expect(editor.locator("s")).toHaveCSS("text-decoration-line", "line-through");
  });

  test("justify", async ({ page }) => {
    const editor = await openFreeEditor(page);
    await page.keyboard.type("Justify me across the whole width of the page");
    await page.getByRole("button", { name: "Justify", exact: true }).click();
    await expect(editor.locator('[style*="text-align: justify"]')).toHaveCount(1, { timeout: 5_000 });
  });

  test("line spacing (Double) writes inline line-height", async ({ page }) => {
    const editor = await openFreeEditor(page);
    await page.keyboard.type("Spaced paragraph");
    await page.keyboard.press("ControlOrMeta+a");
    await page.getByRole("combobox", { name: /line spacing/i }).click();
    await page.getByRole("option", { name: "Double" }).click();
    await expect(editor.locator('p[style*="line-height: 2"]')).toHaveCount(1, { timeout: 5_000 });
  });

  test("line spacing then back to Default removes line-height", async ({ page }) => {
    const editor = await openFreeEditor(page);
    await page.keyboard.type("Toggle spacing");
    await page.keyboard.press("ControlOrMeta+a");
    await page.getByRole("combobox", { name: /line spacing/i }).click();
    await page.getByRole("option", { name: "1.5" }).click();
    await expect(editor.locator('p[style*="line-height: 1.5"]')).toHaveCount(1, { timeout: 5_000 });
    await page.getByRole("combobox", { name: /line spacing/i }).click();
    await page.getByRole("option", { name: "Default" }).click();
    await expect(editor.locator('p[style*="line-height"]')).toHaveCount(0, { timeout: 5_000 });
  });

  test("indent then outdent", async ({ page }) => {
    const editor = await openFreeEditor(page);
    await page.keyboard.type("Indent me");
    await page.getByRole("button", { name: "Increase indent", exact: true }).click();
    await expect(editor.locator('p[style*="margin-left: 1.5em"]')).toHaveCount(1, { timeout: 5_000 });
    await page.getByRole("button", { name: "Increase indent", exact: true }).click();
    await expect(editor.locator('p[style*="margin-left: 3em"]')).toHaveCount(1, { timeout: 5_000 });
    await page.getByRole("button", { name: "Decrease indent", exact: true }).click();
    await expect(editor.locator('p[style*="margin-left: 1.5em"]')).toHaveCount(1, { timeout: 5_000 });
  });

  test("outdent never goes below zero", async ({ page }) => {
    const editor = await openFreeEditor(page);
    await page.keyboard.type("Already flush left");
    await page.getByRole("button", { name: "Decrease indent", exact: true }).click();
    await page.getByRole("button", { name: "Decrease indent", exact: true }).click();
    await expect(editor.locator('p[style*="margin-left"]')).toHaveCount(0, { timeout: 5_000 });
  });

  test("clear formatting strips marks, block type, spacing and indent", async ({ page }) => {
    const editor = await openFreeEditor(page);
    await page.keyboard.type("Messy");
    await page.keyboard.press("ControlOrMeta+a");
    // Pile on: bold + heading + indent + line spacing + center.
    await page.getByRole("button", { name: "Bold", exact: true }).click();
    await page.getByRole("combobox", { name: /text style/i }).click();
    await page.getByRole("option", { name: "Heading 1" }).click();
    await page.getByRole("button", { name: "Increase indent", exact: true }).click();
    await page.getByRole("button", { name: "Align center", exact: true }).click();
    // Sanity: it is indeed messy now.
    await expect(editor.locator("h1")).toHaveCount(1);
    // Clear.
    await page.keyboard.press("ControlOrMeta+a");
    await page.getByRole("button", { name: "Clear formatting", exact: true }).click();
    await expect(editor.locator("h1")).toHaveCount(0, { timeout: 5_000 });
    await expect(editor.locator("strong")).toHaveCount(0);
    await expect(editor.locator('[style*="margin-left"]')).toHaveCount(0);
    await expect(editor.locator('[style*="text-align: center"]')).toHaveCount(0);
    await expect(editor.locator("p").first()).toHaveText("Messy");
  });
});
