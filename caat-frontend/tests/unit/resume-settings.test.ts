import { describe, it, expect } from "vitest";
import {
  marginPxOf,
  coerceSettings,
  MARGIN_PX,
  DEFAULT_SETTINGS,
} from "@/components/resume-builder/settings";

describe("marginPxOf", () => {
  it("maps presets to px", () => {
    expect(marginPxOf({ marginPreset: "narrow" })).toBe(MARGIN_PX.narrow);
    expect(marginPxOf({ marginPreset: "normal" })).toBe(MARGIN_PX.normal);
    expect(marginPxOf({ marginPreset: "wide" })).toBe(MARGIN_PX.wide);
  });
  it("falls back to normal for missing settings", () => {
    expect(marginPxOf(undefined)).toBe(MARGIN_PX.normal);
    expect(marginPxOf(null)).toBe(MARGIN_PX.normal);
  });
  it("normal equals the long-standing 68px default", () => {
    expect(MARGIN_PX.normal).toBe(68);
  });
});

describe("coerceSettings", () => {
  it("accepts valid presets", () => {
    expect(coerceSettings({ marginPreset: "wide" })).toEqual({ marginPreset: "wide" });
  });
  it("defaults on garbage / null / unknown preset", () => {
    expect(coerceSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(coerceSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(coerceSettings({ marginPreset: "huge" })).toEqual(DEFAULT_SETTINGS);
    expect(coerceSettings("nope")).toEqual(DEFAULT_SETTINGS);
    expect(coerceSettings(42)).toEqual(DEFAULT_SETTINGS);
  });
  it("default preset is normal", () => {
    expect(DEFAULT_SETTINGS.marginPreset).toBe("normal");
  });
});
