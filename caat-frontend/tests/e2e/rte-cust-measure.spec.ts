import { test, expect } from "@playwright/test";

/**
 * Deterministic: formats each paragraph in place (block-level attrs apply to the
 * cursor's block, no selection needed), then asserts the inline style in the
 * editor AND the *computed* style in the rendered preview, so we know spacing /
 * indent / justify actually carry through to what the student sees + prints.
 */
test("MEASURE: spacing/indent/justify carry to the preview", async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1100 });
  await page.goto("/resume-builder");
  await page.getByRole("button", { name: "Education", exact: true }).first().click();
  await page.getByRole("button", { name: /free text/i }).click();
  const editor = page.locator(".ProseMirror").first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");

  // Para A — justify.
  await page.keyboard.type("Justified paragraph that should stretch edge to edge across the page width.");
  await page.getByRole("button", { name: "Justify", exact: true }).click();
  await page.keyboard.press("Enter");
  // Para B — double line spacing.
  await page.keyboard.type("Double spaced paragraph with enough words to wrap onto a second visible line in the preview.");
  await page.getByRole("combobox", { name: /line spacing/i }).click();
  await page.getByRole("option", { name: "Double" }).click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  // Para C — indent twice.
  await page.keyboard.type("Indented paragraph pushed in by two indent levels.");
  await page.getByRole("button", { name: "Increase indent", exact: true }).click();
  await page.getByRole("button", { name: "Increase indent", exact: true }).click();

  // Editor inline styles present (block formatting carries to new paragraphs on
  // Enter, Word-style, so counts can be >= 1).
  expect(await editor.locator('[style*="text-align: justify"]').count()).toBeGreaterThanOrEqual(1);
  expect(await editor.locator('p[style*="line-height: 2"]').count()).toBeGreaterThanOrEqual(1);
  await expect(editor.locator('p[style*="margin-left: 3em"]')).toHaveCount(1);

  await page.waitForTimeout(2000);

  // Preview computed styles. The preview renders blocks into .resume-preview-content.
  const previewJustify = page.locator('.resume-preview-content [style*="text-align: justify"]').first();
  await expect(previewJustify).toBeVisible();
  await expect(previewJustify).toHaveCSS("text-align", "justify");

  const previewDouble = page.locator('.resume-preview-content p[style*="line-height: 2"]').first();
  await expect(previewDouble).toBeVisible();
  const lh = await previewDouble.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { lineHeight: cs.lineHeight, fontSize: cs.fontSize };
  });
  // line-height:2 should compute to ~2x the font-size in px.
  console.log("PREVIEW DOUBLE:", JSON.stringify(lh));
  const ratio = parseFloat(lh.lineHeight) / parseFloat(lh.fontSize);
  expect(ratio).toBeGreaterThan(1.9);
  expect(ratio).toBeLessThan(2.1);

  const previewIndent = page.locator('.resume-preview-content p[style*="margin-left: 3em"]').first();
  await expect(previewIndent).toBeVisible();
  const ml = await previewIndent.evaluate((el) => getComputedStyle(el).marginLeft);
  console.log("PREVIEW INDENT margin-left:", ml);
  expect(parseFloat(ml)).toBeGreaterThan(20); // 3em should be well over 20px

  // Screenshots for the human-eyeball pass.
  await page.screenshot({ path: "/tmp/rb-measure-preview.png", fullPage: false });
  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(500);
  await page.pdf({ path: "/tmp/rb-measure.pdf", format: "A4", printBackground: true });
});
