/**
 * Resume editor — batch 1-6 formatting controls.
 * Verifies each new toolbar control produces the right markup.
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
async function typeAndSelectAll(page: import("@playwright/test").Page, text: string) {
  await page.keyboard.type(text);
  await page.keyboard.press("ControlOrMeta+a");
}

test.describe("Resume editor formatting (batch 1-6)", () => {
  test("toolbar renders all new controls (editor did not crash)", async ({ page }) => {
    await openFreeEditor(page);
    for (const name of ["Bold", "Italic", "Underline", "Bullet list", "Numbered list", "Align left", "Link", "Text colour", "Highlight"]) {
      await expect(page.getByRole("button", { name, exact: false }).first()).toBeVisible();
    }
    await expect(page.getByRole("combobox", { name: /text style/i })).toBeVisible();
  });

  test("underline", async ({ page }) => {
    const editor = await openFreeEditor(page);
    await typeAndSelectAll(page, "Underlined");
    await page.getByRole("button", { name: "Underline" }).click();
    await expect(editor.locator("u")).toHaveText("Underlined", { timeout: 5_000 });
  });

  test("bullet list", async ({ page }) => {
    const editor = await openFreeEditor(page);
    await page.keyboard.type("Item one");
    await page.getByRole("button", { name: "Bullet list" }).click();
    await page.keyboard.press("Enter");
    await page.keyboard.type("Item two");
    await expect(editor.locator("ul li")).toHaveCount(2, { timeout: 5_000 });
  });

  test("numbered list", async ({ page }) => {
    const editor = await openFreeEditor(page);
    await page.keyboard.type("First");
    await page.getByRole("button", { name: "Numbered list" }).click();
    await page.keyboard.press("Enter");
    await page.keyboard.type("Second");
    await expect(editor.locator("ol li")).toHaveCount(2, { timeout: 5_000 });
  });

  test("heading", async ({ page }) => {
    const editor = await openFreeEditor(page);
    await page.keyboard.type("Section title");
    await page.getByRole("combobox", { name: /text style/i }).click();
    await page.getByRole("option", { name: "Heading 1" }).click();
    await expect(editor.locator("h1")).toHaveText("Section title", { timeout: 5_000 });
  });

  test("text colour", async ({ page }) => {
    const editor = await openFreeEditor(page);
    await typeAndSelectAll(page, "Coloured");
    await page.getByRole("button", { name: "Text colour" }).click();
    await page.getByRole("menuitem", { name: "CAAT red" }).click();
    await expect(editor.locator("span").first()).toHaveCSS("color", "rgb(154, 26, 39)", { timeout: 5_000 });
  });

  test("highlight", async ({ page }) => {
    const editor = await openFreeEditor(page);
    await typeAndSelectAll(page, "Highlighted");
    await page.getByRole("button", { name: "Highlight" }).click();
    await page.getByRole("menuitem", { name: "Yellow" }).click();
    await expect(editor.locator("span").first()).toHaveCSS("background-color", "rgb(254, 240, 138)", { timeout: 5_000 });
  });

  test("link", async ({ page }) => {
    const editor = await openFreeEditor(page);
    await typeAndSelectAll(page, "Visit site");
    await page.getByRole("button", { name: "Link" }).click();
    await page.getByLabel("Link URL").fill("https://example.com");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(editor.locator('a[href="https://example.com"]')).toHaveText("Visit site", { timeout: 5_000 });
  });

  test("align center", async ({ page }) => {
    const editor = await openFreeEditor(page);
    await page.keyboard.type("Centered");
    await page.getByRole("button", { name: "Align center" }).click();
    await expect(editor.locator('[style*="text-align: center"]')).toHaveCount(1, { timeout: 5_000 });
  });
});
