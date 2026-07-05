// Legacy import path. The implementation now lives in lib/supabase/server.ts
// (typed with the generated Database schema). Kept as a re-export so existing
// `createSupabaseServer` call sites keep resolving.
export { createServerClient as createSupabaseServer } from "./supabase/server";
