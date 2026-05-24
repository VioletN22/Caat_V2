import { describe, it, expect } from "vitest";
import {
  sanitizePostHtml,
  htmlToText,
  looksLikeHtml,
  postBodyHtml,
} from "@/lib/sanitize-html";

describe("sanitizePostHtml", () => {
  it("keeps allowed formatting tags", () => {
    const html =
      "<p>hi <strong>b</strong> <em>i</em> <u>u</u> <s>s</s></p><ul><li>x</li></ul><ol><li>y</li></ol>";
    const out = sanitizePostHtml(html);
    expect(out).toContain("<strong>b</strong>");
    expect(out).toContain("<em>i</em>");
    expect(out).toContain("<u>u</u>");
    expect(out).toContain("<s>s</s>");
    expect(out).toContain("<ul><li>x</li></ul>");
    expect(out).toContain("<ol><li>y</li></ol>");
  });

  it("strips scripts, images and event handlers", () => {
    const out = sanitizePostHtml(
      '<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1)><div onclick="evil()">d</div>',
    );
    expect(out).not.toContain("script");
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("<img");
    expect(out).not.toContain("<div");
    expect(out).toContain("<p>ok</p>");
    expect(out).toContain("d"); // disallowed tag dropped, text kept
  });

  it("drops javascript: links but keeps safe ones, hardened", () => {
    const out = sanitizePostHtml(
      '<a href="javascript:alert(1)">x</a><a href="https://ok.com">ok</a>',
    );
    expect(out).not.toContain("javascript:");
    expect(out).toContain('href="https://ok.com"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
    expect(out).toContain('target="_blank"');
  });

  it("handles empty / null-ish input", () => {
    expect(sanitizePostHtml("")).toBe("");
    // @ts-expect-error testing runtime safety
    expect(sanitizePostHtml(undefined)).toBe("");
  });
});

describe("htmlToText", () => {
  it("strips all tags to plain text", () => {
    expect(htmlToText("<p>hello <strong>world</strong></p>")).toBe("hello world");
  });
  it("trims and handles empty", () => {
    expect(htmlToText("  <p> x </p> ")).toBe("x");
    expect(htmlToText("")).toBe("");
  });
});

describe("looksLikeHtml", () => {
  it("detects tags vs plain text", () => {
    expect(looksLikeHtml("<p>x</p>")).toBe(true);
    expect(looksLikeHtml("just text")).toBe(false);
    expect(looksLikeHtml("a < b and c > d")).toBe(false);
  });
});

describe("postBodyHtml", () => {
  it("escapes plain text and converts newlines to <br>", () => {
    expect(postBodyHtml("line1\nline2")).toBe("line1<br>line2");
    expect(postBodyHtml("<not a tag")).toContain("&lt;not a tag");
  });
  it("sanitizes when content is HTML", () => {
    const out = postBodyHtml("<p>hi</p><script>x</script>");
    expect(out).toContain("<p>hi</p>");
    expect(out).not.toContain("script");
  });
  it("returns empty for empty", () => {
    expect(postBodyHtml("")).toBe("");
  });
});
