import { describe, it, expect } from "vitest";
import { safeHref } from "@/lib/safe-href";

describe("safeHref", () => {
  it("returns null for missing/empty", () => {
    expect(safeHref(null)).toBeNull();
    expect(safeHref(undefined)).toBeNull();
    expect(safeHref("")).toBeNull();
    expect(safeHref("   ")).toBeNull();
  });
  it("keeps valid http/https URLs", () => {
    expect(safeHref("https://example.com")).toBe("https://example.com");
    expect(safeHref("http://example.com/path?q=1")).toBe("http://example.com/path?q=1");
  });
  it("adds https:// to scheme-less URLs", () => {
    expect(safeHref("university.edu")).toBe("https://university.edu");
    expect(safeHref("  example.com/x  ")).toBe("https://example.com/x");
  });
  it("rejects dangerous schemes", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,<script>")).toBeNull();
    expect(safeHref("vbscript:msgbox(1)")).toBeNull();
    expect(safeHref("ftp://x.com")).toBeNull();
  });
});
