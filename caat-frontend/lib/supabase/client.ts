import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

let browserClient:
  | ReturnType<typeof createBrowserClient<Database>>
  | undefined;

/**
 * Typed browser Supabase singleton for Client Components. Lazily instantiated
 * and memoized so every client component shares one connection/auth listener.
 */
export function getBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}

/**
 * Backwards-compatible singleton alias. Prefer `getBrowserClient()` in new code.
 */
export const supabase = getBrowserClient();
