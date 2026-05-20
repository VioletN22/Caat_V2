"use client";

import type { Ref } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  ref?: Ref<TurnstileInstance>;
}

/**
 * Renders a Cloudflare Turnstile widget. Skips rendering (and immediately
 * "verifies" with an empty token) when NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't
 * set — server-side verification will likewise no-op in that case, keeping
 * local dev simple.
 *
 * Forwards a ref to the underlying Turnstile instance so callers can call
 * `.reset()` after a failed auth attempt — Turnstile tokens are single-use,
 * so any consumed token must be replaced before the next siteverify call.
 */
export function TurnstileWidget({ onVerify, onExpire, ref }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!siteKey) return null;

  return (
    <div className="mb-6">
      <Turnstile
        ref={ref}
        siteKey={siteKey}
        onSuccess={onVerify}
        onExpire={onExpire}
        options={{ theme: "light" }}
      />
    </div>
  );
}

/**
 * True when CAPTCHA is enforced (i.e. site key is configured). Use to decide
 * whether the form's submit button should be disabled until a token arrives.
 */
export const captchaEnabled = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export type { TurnstileInstance };
