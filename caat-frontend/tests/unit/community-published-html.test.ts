import { describe, it, expect } from "vitest";
import { publishedHtml, isEmptyHtml } from "@/components/resume-builder/publishedHtml";

describe("isEmptyHtml", () => {
  it("treats blank / empty markup as empty", () => {
    expect(isEmptyHtml("")).toBe(true);
    expect(isEmptyHtml(undefined)).toBe(true);
    expect(isEmptyHtml("<p></p>")).toBe(true);
    expect(isEmptyHtml("<p>&nbsp;</p>")).toBe(true);
  });
  it("treats real content as non-empty", () => {
    expect(isEmptyHtml("<p>hi</p>")).toBe(false);
    expect(isEmptyHtml("plain")).toBe(false);
  });
});

describe("publishedHtml — free mode", () => {
  it("returns the section's own contentHtml", () => {
    expect(publishedHtml({ type: "custom", mode: "free", contentHtml: "<p>hi</p>" })).toBe("<p>hi</p>");
  });
  it("free education uses contentHtml, not structuredData", () => {
    const out = publishedHtml({
      type: "education",
      mode: "free",
      contentHtml: "<p>free text</p>",
      structuredData: { entries: [{ id: "1", institution: "Ignored U" }] },
    });
    expect(out).toBe("<p>free text</p>");
    expect(out).not.toContain("Ignored U");
  });
});

describe("publishedHtml — guided generation", () => {
  it("education renders institution/degree/dates", () => {
    const out = publishedHtml({
      type: "education",
      mode: "guided",
      contentHtml: "",
      structuredData: {
        entries: [{ id: "1", institution: "MIT", degree: "BSc", field: "CS", startDate: "2021", endDate: "2025", current: false, gpa: "3.9", description: "" }],
      },
    });
    expect(out).toContain("MIT");
    expect(out).toContain("BSc");
    expect(out).toContain("2021");
    expect(out).toContain("GPA: 3.9");
  });

  it("experience renders company/title and embeds rich description", () => {
    const out = publishedHtml({
      type: "experience",
      mode: "guided",
      contentHtml: "",
      structuredData: {
        entries: [{ id: "1", company: "Acme", title: "Intern", location: "Remote", startDate: "2024", endDate: "", current: true, description: "<ul><li>shipped</li></ul>" }],
      },
    });
    expect(out).toContain("Acme");
    expect(out).toContain("Intern");
    expect(out).toContain("<li>shipped</li>");
    expect(out).toContain("Present");
  });

  it("skills renders categories", () => {
    const out = publishedHtml({
      type: "skills",
      mode: "guided",
      contentHtml: "",
      structuredData: { categories: [{ name: "Languages", skills: "TypeScript, Go" }] },
    });
    expect(out).toContain("Languages");
    expect(out).toContain("TypeScript, Go");
  });

  it("escapes HTML in structured fields (no injection via institution)", () => {
    const out = publishedHtml({
      type: "education",
      mode: "guided",
      contentHtml: "",
      structuredData: { entries: [{ id: "1", institution: "<script>alert(1)</script>", degree: "", field: "", startDate: "", endDate: "", current: false, gpa: "", description: "" }] },
    });
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("empty guided data yields empty output", () => {
    expect(publishedHtml({ type: "education", mode: "guided", contentHtml: "", structuredData: {} })).toBe("");
  });
});
