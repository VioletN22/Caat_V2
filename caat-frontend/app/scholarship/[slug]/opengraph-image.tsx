import { ImageResponse } from "next/og";
import { getPublicScholarshipBySlug } from "@/lib/public-scholarships";
import { formatAmountDisplay } from "@/types/scholarships";

export const alt = "Scholarship on CAAT";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND_RED = "#9a1a27";
const OFF_WHITE = "#f7f3ee";

function fmtDate(d: string | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-AU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Templated 1200x630 social card per scholarship: name + amount + deadline on
// the brand card. Self-contained (no external assets or fonts fetched).
export default async function Image({ params }: { params: { slug: string } }) {
  const s = await getPublicScholarshipBySlug(params.slug);

  const title = s?.title ?? "Scholarship";
  const provider = s?.provider_name ?? "CAAT";
  const amount = s ? formatAmountDisplay(s) : "";
  const hasAmount =
    s != null && (s.amount_value != null || s.amount_display) && amount !== "See Details";
  const deadline = s ? fmtDate(s.deadline_at) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          backgroundColor: BRAND_RED,
          backgroundImage:
            "radial-gradient(circle at 82% 12%, rgba(255,255,255,0.10), transparent 45%)",
          color: OFF_WHITE,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(247,243,238,0.82)",
            }}
          >
            {provider}
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: title.length > 70 ? 60 : 76,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: 1040,
              display: "flex",
            }}
          >
            {title.length > 120 ? `${title.slice(0, 117)}...` : title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {hasAmount && (
              <div style={{ fontSize: 52, fontWeight: 700 }}>{amount}</div>
            )}
            {deadline && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 28,
                  color: "rgba(247,243,238,0.82)",
                }}
              >
                Closes {deadline}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: "-0.03em",
            }}
          >
            CAAT
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
