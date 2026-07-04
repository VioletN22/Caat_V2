import { ImageResponse } from "next/og";

// Branded 1200x630 social card, rendered at build/request time by next/og.
// Self-contained: no external assets or fonts are fetched.
export const alt = "CAAT: College Application Assistance Tool";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND_RED = "#9a1a27";
const OFF_WHITE = "#f7f3ee";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "96px",
          backgroundColor: BRAND_RED,
          backgroundImage:
            "radial-gradient(circle at 78% 18%, rgba(255,255,255,0.10), transparent 45%)",
          color: OFF_WHITE,
        }}
      >
        <div
          style={{
            fontSize: 200,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          CAAT
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 46,
            fontWeight: 600,
            color: OFF_WHITE,
          }}
        >
          College Application Assistance Tool
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 30,
            color: "rgba(247,243,238,0.82)",
            maxWidth: 900,
          }}
        >
          Compare universities, track applications and deadlines, and match
          scholarships to your profile.
        </div>
      </div>
    ),
    { ...size }
  );
}
