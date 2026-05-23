/**
 * 2.7 Resume Builder Flow
 */
import { test, expect } from "@playwright/test";

test.describe("Resume Builder", () => {
  test("page loads with 3-panel layout", async ({ page }) => {
    await page.goto("/resume-builder");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/personal|education|experience|skills/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("clicking a section in structure panel loads the editor", async ({ page }) => {
    await page.goto("/resume-builder");
    const sectionBtn = page.getByRole("button", { name: /personal|education|experience/i }).first();
    await expect(sectionBtn).toBeVisible({ timeout: 10_000 });
    await sectionBtn.click();
    await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 3_000 });
  });

  test("autosave indicator shown after editing content", async ({ page }) => {
    await page.goto("/resume-builder");
    const sectionBtn = page.getByRole("button", { name: /personal|education|experience/i }).first();
    await expect(sectionBtn).toBeVisible({ timeout: 10_000 });
    await sectionBtn.click();
    const textbox = page.getByRole("textbox").first();
    await expect(textbox).toBeVisible({ timeout: 5_000 });
    await textbox.click();
    await textbox.pressSequentially(" ");
    await expect(
      page.getByText(/saving|last saved/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test("resume switcher is visible", async ({ page }) => {
    await page.goto("/resume-builder");
    // Switcher is now a styled Select (combobox), not a native <select>.
    await expect(
      page.getByRole("combobox", { name: /switch resume/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("print/PDF button is visible", async ({ page }) => {
    await page.goto("/resume-builder");
    await expect(
      page.getByRole("button", { name: /print.*pdf|pdf|print/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  // --- RichTextEditor font/size dropdowns (converted from native <select>) ---

  /** Open the RichTextEditor by activating a section and switching it to
   *  Free Text mode (renders the editor + its font toolbar). Returns the
   *  ProseMirror editor locator. */
  async function openRichEditor(page: import("@playwright/test").Page) {
    await page.goto("/resume-builder");
    await page.getByRole("button", { name: /personal|education|experience/i }).first().click();
    await page.getByRole("button", { name: /free text/i }).click();
    await expect(page.getByRole("combobox", { name: /font family/i })).toBeVisible({
      timeout: 10_000,
    });
    const editor = page.locator(".ProseMirror").first();
    // Tests share a persisted resume; clear the section so each run is clean.
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Delete");
    return editor;
  }

  async function typeAndSelect(page: import("@playwright/test").Page, text: string) {
    await page.keyboard.type(text);
    await page.keyboard.press("ControlOrMeta+a");
  }

  // Radix Select option click can be flaky against an editor that re-renders on
  // every transaction; its keyboard typeahead (open -> type -> Enter) is the
  // robust, accessible path and is what we assert against.
  async function pickFromSelect(
    page: import("@playwright/test").Page,
    comboName: RegExp,
    optionName: string
  ) {
    await page.getByRole("combobox", { name: comboName }).click();
    const option = page.getByRole("option", { name: optionName, exact: true });
    await option.waitFor({ state: "visible" });
    await option.click();
  }

  test("font family dropdown applies the font to the selected text", async ({ page }) => {
    const editor = await openRichEditor(page);
    await typeAndSelect(page, "Hello world");

    await pickFromSelect(page, /font family/i, "Georgia");

    // Tiptap wraps the selection in a span with the font-family applied.
    await expect(editor.locator('span[style*="Georgia"]')).toHaveCount(1, { timeout: 5_000 });
    await expect(page.getByRole("combobox", { name: /font family/i })).toContainText("Georgia");
  });

  test("font size dropdown applies the size to the selected text", async ({ page }) => {
    const editor = await openRichEditor(page);
    await typeAndSelect(page, "Sized text");

    await pickFromSelect(page, /font size/i, "24");

    await expect(editor.locator('span[style*="font-size: 24px"]')).toHaveCount(1, {
      timeout: 5_000,
    });
    await expect(page.getByRole("combobox", { name: /font size/i })).toContainText("24");
  });

  test("font applies to the originally-selected text (selection survives the popover)", async ({ page }) => {
    const editor = await openRichEditor(page);
    await typeAndSelect(page, "Focus check");

    await pickFromSelect(page, /font family/i, "Verdana");

    await expect(editor.locator('span[style*="Verdana"]')).toHaveCount(1, { timeout: 5_000 });
    await expect(editor).toContainText("Focus check");
  });
});
