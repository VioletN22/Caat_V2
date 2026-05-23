// Resume-level (whole-document) settings. The first slice of resume-level
// theming: page margins. Future controls (base font/size/accent) live here too.
export type MarginPreset = "narrow" | "normal" | "wide";

export type ResumeSettings = {
  marginPreset: MarginPreset;
};

export const DEFAULT_SETTINGS: ResumeSettings = { marginPreset: "normal" };

// Page padding in px for each preset. "normal" (68) matches the long-standing
// hardcoded PAGE_PADDING_PX so existing resumes are unchanged.
export const MARGIN_PX: Record<MarginPreset, number> = {
  narrow: 48,
  normal: 68,
  wide: 92,
};

export const MARGIN_LABELS: Record<MarginPreset, string> = {
  narrow: "Narrow",
  normal: "Normal",
  wide: "Wide",
};

export function marginPxOf(settings: ResumeSettings | undefined | null): number {
  return MARGIN_PX[settings?.marginPreset ?? "normal"];
}

// Tolerant parse from whatever the DB returns (jsonb or null).
export function coerceSettings(raw: unknown): ResumeSettings {
  if (raw && typeof raw === "object") {
    const mp = (raw as { marginPreset?: string }).marginPreset;
    if (mp === "narrow" || mp === "normal" || mp === "wide") {
      return { marginPreset: mp };
    }
  }
  return { ...DEFAULT_SETTINGS };
}
