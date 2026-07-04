"use server";

import { createServerClient } from "@/lib/supabase/server";

// F5 - Account deletion. The anon/authenticated client cannot delete an auth
// user, so this calls the SECURITY DEFINER `delete_own_account()` RPC, which
// wipes every row the caller owns (scoped to auth.uid()) and removes their
// auth.users row. We then sign out to clear the now-orphaned session cookies.
export async function deleteMyAccount(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You are not signed in." };
  }

  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    return { ok: false, error: "Could not delete your account. Please try again." };
  }

  // The auth user is gone; clear the session cookies too. Ignore errors here
  // because the account is already deleted at this point.
  await supabase.auth.signOut();

  return { ok: true };
}
