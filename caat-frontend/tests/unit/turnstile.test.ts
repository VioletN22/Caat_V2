import { describe, it, expect, vi, afterEach } from "vitest";

// turnstile.ts is `server-only`; neutralise that guard so it imports under the
// node test environment.
vi.mock("server-only", () => ({}));

import { verifyTurnstile } from "@/lib/turnstile";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyTurnstile — A4 fail-closed in real production", () => {
  it("fails closed when the secret is missing in real production (VERCEL_ENV=production)", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");

    const result = await verifyTurnstile(undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("CAPTCHA is not configured");
  });

  it("fails closed in real production even when a token is supplied but no secret is set", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");

    const result = await verifyTurnstile("some-token");
    expect(result.ok).toBe(false);
  });

  it("stays permissive in CI / preview deploys where NODE_ENV=production but VERCEL_ENV is not production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");

    const result = await verifyTurnstile(undefined);
    expect(result.ok).toBe(true);
  });

  it("stays permissive when the secret is missing outside production (dev/test)", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");

    const result = await verifyTurnstile(undefined);
    expect(result.ok).toBe(true);
  });
});
