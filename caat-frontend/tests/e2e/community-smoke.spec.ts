import { test, expect } from "@playwright/test";

test("community: create rich post, like, comment, edit/delete controls", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/communities");
  await expect(page.getByText(/Share your experience/)).toBeVisible({ timeout: 15_000 });

  const content = `SmokePost ${Date.now()}`;

  // Expand composer + type into the rich editor, then bold the text.
  await page.getByText(/Share your experience/).click();
  const editor = page.locator(".ProseMirror").first();
  await editor.click();
  await page.keyboard.type(content);
  await page.keyboard.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Bold", exact: true }).first().click();

  await page.getByText("Select a topic").click();
  await page.getByRole("option", { name: "Advice", exact: true }).click();
  await page.getByRole("button", { name: "Post", exact: true }).click();

  // Renders as sanitized rich HTML — bold, not raw tags or markdown.
  await expect(
    page.locator(".community-prose strong").filter({ hasText: content }).first()
  ).toBeVisible({ timeout: 15_000 });
  // No raw tags leaked into the visible text.
  await expect(page.getByText("<strong>", { exact: false })).toHaveCount(0);

  // Like (toggleLike + block gate).
  await page.locator("button:has(svg.lucide-heart)").first().click();
  await page.waitForTimeout(600);
  await expect(page.getByText(/isn.t available|Too many/i)).toHaveCount(0);

  // Comment.
  await page.locator("button:has(svg.lucide-message-circle)").first().click();
  const commentBox = page.getByPlaceholder(/Write a comment/).first();
  await expect(commentBox).toBeVisible({ timeout: 10_000 });
  const commentText = `SmokeComment ${Date.now()}`;
  await commentBox.fill(commentText);
  await commentBox.press("ControlOrMeta+Enter");
  await expect(page.getByText(commentText).first()).toBeVisible({ timeout: 10_000 });

  // Own comment edit/delete controls present.
  await expect(page.getByRole("button", { name: "Edit", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete", exact: true }).first()).toBeVisible();
});
