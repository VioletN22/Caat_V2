import "server-only";

// D3 — Cloudflare Turnstile verification.
// Called from the auth pre-flight server action. When TURNSTILE_SECRET_KEY is
// not configured (e.g. local dev, CI), verification is skipped so behaviour is
// unchanged. Production must set this env var and the matching site key.

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(
  token: string | undefined
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // A4 — fail closed in real production only. A missing secret in prod is a
  // misconfig that must NOT silently disable CAPTCHA. We gate on VERCEL_ENV
  // (set to "production" only on the true prod deploy), not NODE_ENV, because
  // NODE_ENV is "production" for preview deploys and in CI too, which would
  // otherwise fail-close login there and break the e2e smoke.
  if (!secret) {
    if (process.env.VERCEL_ENV === "production") {
      return { ok: false, error: "CAPTCHA is not configured" };
    }
    return { ok: true };
  }

  if (!token) return { ok: false, error: "CAPTCHA verification required." };

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      // Edge/Node both fine; Turnstile responds quickly so no explicit timeout.
    });
    if (!res.ok) return { ok: false, error: "CAPTCHA verification failed." };
    const data = (await res.json()) as { success: boolean };
    if (!data.success) return { ok: false, error: "CAPTCHA verification failed." };
    return { ok: true };
  } catch {
    return { ok: false, error: "CAPTCHA verification could not be reached." };
  }
}

export function turnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;
}
