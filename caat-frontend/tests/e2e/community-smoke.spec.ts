import { test, expect } from "@playwright/test";

test("community: create post, like, comment", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/communities");
  await expect(page.getByText(/Share your experience/)).toBeVisible({ timeout: 15_000 });

  const content = `SmokePost ${Date.now()}`;

  // Expand composer + fill.
  await page.getByText(/Share your experience/).click();
  await page.getByPlaceholder("What's on your mind?").fill(content);
  await page.getByText("Select a topic").click();
  await page.getByRole("option", { name: "Advice", exact: true }).click();
  await page.getByRole("button", { name: "Post", exact: true }).click();

  // Appears in the feed (createPost + fetchPosts with new keyset cursor).
  await expect(page.getByText(content).first()).toBeVisible({ timeout: 15_000 });

  // Like the newest post (mine, at top) — exercises toggleLike + block gate.
  await page.locator("button:has(svg.lucide-heart)").first().click();
  await page.waitForTimeout(800);
  await expect(page.getByText(/isn.t available|Too many/i)).toHaveCount(0);

  // Comment — exercises addComment + block gate.
  await page.locator("button:has(svg.lucide-message-circle)").first().click();
  const commentBox = page.getByPlaceholder(/Write a comment/).first();
  await expect(commentBox).toBeVisible({ timeout: 10_000 });
  const commentText = `SmokeComment ${Date.now()}`;
  await commentBox.fill(commentText);
  await commentBox.press("ControlOrMeta+Enter");
  await expect(page.getByText(commentText).first()).toBeVisible({ timeout: 10_000 });

  // Own comment shows Edit + Delete controls (UI present regardless of the
  // edited_at/is_deleted migration; persistence verified separately).
  await expect(page.getByRole("button", { name: "Edit", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete", exact: true }).first()).toBeVisible();
});
