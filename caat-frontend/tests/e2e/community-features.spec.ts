import { test, expect } from "@playwright/test";

async function createPost(page: import("@playwright/test").Page, text: string, bold = false) {
  await page.goto("/communities");
  await expect(page.getByText(/Share your experience/)).toBeVisible({ timeout: 15_000 });
  await page.getByText(/Share your experience/).click();
  const editor = page.locator(".ProseMirror").first();
  await editor.click();
  await page.keyboard.type(text);
  if (bold) {
    await page.keyboard.press("ControlOrMeta+a");
    await page.getByRole("button", { name: "Bold", exact: true }).first().click();
  }
  await page.getByText("Select a topic").click();
  await page.getByRole("option", { name: "Advice", exact: true }).click();
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 15_000 });
}

async function openComments(page: import("@playwright/test").Page) {
  await page.locator("button:has(svg.lucide-message-circle)").first().click();
  await expect(page.getByPlaceholder(/Write a comment/).first()).toBeVisible({ timeout: 10_000 });
}
async function addComment(page: import("@playwright/test").Page, text: string) {
  const box = page.getByPlaceholder(/Write a comment/).first();
  await box.fill(text);
  await box.press("ControlOrMeta+Enter");
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 10_000 });
}

test("rich post renders bold + comment edit + comment delete (leaf)", async ({ page }) => {
  test.setTimeout(90_000);
  const txt = `RichA ${Date.now()}`;
  await createPost(page, txt, true);
  await expect(page.locator(".community-prose strong").filter({ hasText: txt }).first()).toBeVisible();

  await openComments(page);
  await addComment(page, `cmtA ${Date.now()}`);

  // Edit the comment (now that edited_at exists).
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  await page.keyboard.press("ControlOrMeta+a");
  const editedText = `editedA ${Date.now()}`;
  await page.keyboard.type(editedText);
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect(page.getByText(editedText).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("edited").first()).toBeVisible();

  // Delete the (leaf) comment -> removed.
  await page.getByRole("button", { name: "Delete", exact: true }).first().click();
  await page.getByRole("button", { name: "Yes", exact: true }).first().click();
  await expect(page.getByText(editedText)).toHaveCount(0, { timeout: 10_000 });
});

test("comment with a reply soft-deletes to [deleted] and keeps the reply", async ({ page }) => {
  test.setTimeout(90_000);
  await createPost(page, `RichB ${Date.now()}`, false);
  await openComments(page);
  const parent = `parentB ${Date.now()}`;
  await addComment(page, parent);

  // Reply to the parent.
  await page.getByRole("button", { name: "Reply", exact: true }).first().click();
  const reply = `replyB ${Date.now()}`;
  const replyBox = page.getByPlaceholder("Write a reply…").first();
  await replyBox.fill(reply);
  await replyBox.press("ControlOrMeta+Enter");
  await expect(page.getByText(reply).first()).toBeVisible({ timeout: 10_000 });

  // Delete the parent -> soft-deleted, reply survives.
  await page.getByRole("button", { name: "Delete", exact: true }).first().click();
  await page.getByRole("button", { name: "Yes", exact: true }).first().click();
  await expect(page.getByText("[deleted]").first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(reply).first()).toBeVisible();
  await expect(page.getByText(parent)).toHaveCount(0);
});

test("post delete removes it from the feed (cascade)", async ({ page }) => {
  test.setTimeout(90_000);
  const txt = `DeleteMeP ${Date.now()}`;
  await createPost(page, txt, false);
  // Scope to the exact card (not .first(), which can be a pinned/other post).
  const card = page.locator("div.bg-card").filter({ hasText: txt }).first();
  await card.getByRole("button", { name: "More options" }).click();
  await page.getByRole("menuitem", { name: /Delete post/i }).click();
  await expect(page.locator("div.bg-card").filter({ hasText: txt })).toHaveCount(0, { timeout: 10_000 });
});

test("composer draft autosaves and restores after reload", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/communities");
  await page.getByText(/Share your experience/).click();
  const editor = page.locator(".ProseMirror").first();
  await editor.click();
  const draft = `DraftZ ${Date.now()}`;
  await page.keyboard.type(draft);
  await page.waitForTimeout(800); // let the autosave effect write
  await page.reload();
  await expect(page.getByText(draft).first()).toBeVisible({ timeout: 15_000 });
  // Clean up the draft so it doesn't linger.
  await page.getByText(draft).first().click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
});
