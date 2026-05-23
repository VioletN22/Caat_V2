/**
 * Guided <-> Free Text are independent drafts. The toggle publishes one to the
 * preview; switching never erases the other.
 */
import { test, expect } from "@playwright/test";

const GUIDED_TEXT = "MITInstituteXYZ";
const FREE_TEXT = "FREEDRAFT12345";

async function openEducation(page: import("@playwright/test").Page) {
  await page.goto("/resume-builder");
  await page.getByRole("button", { name: "Education", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Guided", exact: true }).first()).toBeVisible({ timeout: 10_000 });
}

function previewText(page: import("@playwright/test").Page, text: string) {
  // Visible rendered preview only (measurement nodes sit off-screen).
  return page.getByText(text, { exact: false }).filter({ visible: true });
}

test.describe("Guided / Free Text independent drafts", () => {
  test("filling guided then free keeps both, preview follows the toggle", async ({ page }) => {
    await openEducation(page);

    // Start clean: clear the free-text draft so we can verify the empty state.
    await page.getByRole("button", { name: "Free Text", exact: true }).first().click();
    const editor = page.locator(".ProseMirror").first();
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Delete");
    await expect(page.getByText(/your free-text version is empty/i).first()).toBeVisible();

    // 1. Guided: fill institution + degree -> preview shows it, label says Guided.
    await page.getByRole("button", { name: "Guided", exact: true }).first().click();
    await page.getByPlaceholder("University of Sydney").first().fill(GUIDED_TEXT);
    await page.getByPlaceholder("Bachelor of Science").first().fill("BSc");
    await page.waitForTimeout(1500);
    await expect(previewText(page, GUIDED_TEXT).first()).toBeVisible();
    await expect(page.getByText(/Preview is using/).first()).toContainText("Guided");

    // 2. Switch to Free (empty) -> guided gone from preview, hint shown, label Free Text.
    await page.getByRole("button", { name: "Free Text", exact: true }).first().click();
    await expect(page.getByText(/your free-text version is empty/i).first()).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(previewText(page, GUIDED_TEXT)).toHaveCount(0);
    await expect(page.getByText(/Preview is using/).first()).toContainText("Free Text");

    // 3. Type free text -> preview shows it.
    await editor.click();
    await page.keyboard.type(FREE_TEXT);
    await page.waitForTimeout(1500);
    await expect(previewText(page, FREE_TEXT).first()).toBeVisible();

    // 4. Back to Guided: guided returns, free text not published, guided data intact.
    await page.getByRole("button", { name: "Guided", exact: true }).first().click();
    await page.waitForTimeout(1500);
    await expect(previewText(page, GUIDED_TEXT).first()).toBeVisible();
    await expect(previewText(page, FREE_TEXT)).toHaveCount(0);
    await expect(page.getByPlaceholder("University of Sydney").first()).toHaveValue(GUIDED_TEXT);

    // 5. Back to Free: the free draft survived untouched.
    await page.getByRole("button", { name: "Free Text", exact: true }).first().click();
    await expect(page.locator(".ProseMirror").first()).toContainText(FREE_TEXT);
    await page.waitForTimeout(1200);
    await expect(previewText(page, FREE_TEXT).first()).toBeVisible();
  });
});
