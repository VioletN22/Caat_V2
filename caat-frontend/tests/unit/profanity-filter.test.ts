import { describe, it, expect } from "vitest";
import { containsProfanity } from "@/lib/profanity-filter";

describe("containsProfanity", () => {
  it("flags blocked words (case-insensitive)", () => {
    expect(containsProfanity("this is shit")).toBe(true);
    expect(containsProfanity("FUCK this")).toBe(true);
  });
  it("does not flag clean text", () => {
    expect(containsProfanity("I love this community")).toBe(false);
    expect(containsProfanity("")).toBe(false);
  });
  it("only matches whole words (no false positives inside longer words)", () => {
    expect(containsProfanity("assignment due tomorrow")).toBe(false); // not "ass"
    expect(containsProfanity("class of 2029")).toBe(false);
    expect(containsProfanity("Scunthorpe")).toBe(false); // classic false-positive check
    expect(containsProfanity("shiitake mushrooms")).toBe(false);
  });
});
