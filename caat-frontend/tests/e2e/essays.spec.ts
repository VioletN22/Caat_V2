/**
 * 2.8 Essays Flow
 *
 * The autosave test used to wrap every assertion in `if (isVisible)`, so it
 * passed green even when no editor/textbox rendered (the test account has no
 * seeded prompt) — a false signal for the exact data-loss path (B4) it was
 * meant to guard. It now SEEDS a real prompt through the "Add custom essay"
 * UI, drives the autosave path with unconditional assertions, and cleans up
 * the seeded essay afterwards. If seeding itself fails, the test FAILS (it
 * never silently passes).
 */
import { test, expect, type Page } from "@playwright/test";

async function deleteCustomEssay(page: Page, title: string) {
  // Best-effort cleanup: hover the row to reveal the delete control, then
  // confirm. Swallow errors so a cleanup miss never masks the real result.
  try {
    const row = page.locator("div.group", { hasText: title }).first();
    if (!(await row.count())) return;
    await row.hover();
    await row.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: /^Delete$/ }).click();
    await expect(page.getByText(title)).toHaveCount(0, { timeout: 5_000 });
  } catch {
    // ignore
  }
}

test.describe("Essays", () => {
  test("page loads with prompts list and editor panel", async ({ page }) => {
    await page.goto("/essays");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/prompt|essay|no prompts/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("seeded custom essay: selecting it, typing, and autosave all work (B4)", async ({ page }) => {
    const title = `E2E autosave ${Date.now()}`;
    await page.goto("/essays");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 10_000 });

    try {
      // Seed a prompt via the UI so the editor path is real, not conditional.
      await page.getByRole("button", { name: "Add custom essay" }).click();
      const titleInput = page.getByPlaceholder("Essay title…");
      await titleInput.fill(title);
      await titleInput.press("Enter");

      // Creating a custom essay selects it. With no draft yet, the empty state
      // offers "New draft" — create one to reveal the editor.
      const newDraft = page.getByRole("button", { name: /new draft/i }).first();
      await expect(newDraft).toBeVisible({ timeout: 10_000 });
      await newDraft.click();

      // The editor textbox must now be present — assert unconditionally.
      const editor = page.getByPlaceholder("Start writing your essay here.");
      await expect(editor).toBeVisible({ timeout: 10_000 });

      await editor.click();
      await editor.fill("This is a real autosave assertion, not a conditional no-op.");

      // Autosave (2s debounce) must reach a saved/saving state. This is the
      // assertion that was previously skipped when no textbox existed.
      await expect(page.getByText(/saving|last saved on/i).first()).toBeVisible({ timeout: 10_000 });
    } finally {
      await deleteCustomEssay(page, title);
    }
  });
});
