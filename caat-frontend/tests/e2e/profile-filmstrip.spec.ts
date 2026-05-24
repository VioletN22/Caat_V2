/**
 * Profile resume preview uses the filmstrip (display="filmstrip") with group
 * navigation for multi-page resumes. Also guards the builder's panel mode from
 * the shared-component refactor.
 *
 * Strategy: rename the builder's resume to a unique title + fill it with enough
 * content for several pages, then select it by that unique title in a narrow
 * profile viewport (so more than one page-group is needed -> group nav shows).
 */
import { test, expect } from "@playwright/test";

const TITLE = "ZZFilmstrip";

test("multi-page resume: builder stacks pages; profile shows filmstrip + group nav", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1400, height: 950 });

  // 1. Builder: give the loaded resume a unique title, then fill it.
  await page.goto("/resume-builder");
  await page.getByRole("button", { name: "Rename resume" }).click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(TITLE);
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "Education", exact: true }).first().click();
  await page.getByRole("button", { name: /free text/i }).first().click();
  const editor = page.locator(".ProseMirror").first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  const longHtml = Array.from({ length: 180 }, (_, i) =>
    `<p>Line ${i + 1}: lorem ipsum dolor sit amet consectetur adipiscing elit.</p>`
  ).join("");
  await editor.evaluate((el, html) => {
    const dt = new DataTransfer();
    dt.setData("text/html", html);
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, longHtml);
  await page.waitForTimeout(3000); // let pagination + autosave settle

  // Builder (panel mode) renders multiple stacked pages.
  expect(await page.locator(".resume-page").count()).toBeGreaterThan(1);

  // 2. Profile, narrow viewport so a page-group can't show every page at once.
  await page.setViewportSize({ width: 620, height: 950 });
  await page.goto("/profile");
  await page.getByText("Your Resumes").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await page.locator('button.min-w-\\[160px\\]').first().click();
  await page.getByRole("menuitem", { name: TITLE }).first().click();
  await expect(page.locator(".resume-page").first()).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1500);

  // Group nav is present and a group-skip works.
  const nextBtn = page.getByRole("button", { name: "Next pages" });
  await expect(nextBtn).toBeVisible();
  await page.getByText("Your Resumes").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/fs-profile-1.png", fullPage: false });
  await nextBtn.click();
  await page.waitForTimeout(700);
  await expect(page.getByRole("button", { name: "Previous pages" })).toBeEnabled();
  await page.getByText("Your Resumes").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/fs-profile-2.png", fullPage: false });
});
