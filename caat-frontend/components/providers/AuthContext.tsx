"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
});

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  /**
   * User resolved once on the server (C5). When provided, the provider seeds
   * from it and skips the client-side getUser() round trip that every (main)
   * navigation used to fire; onAuthStateChange still keeps it in sync.
   */
  initialUser?: User | null;
}) {
  const hasInitial = initialUser !== undefined;
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [loading, setLoading] = useState(!hasInitial);

  useEffect(() => {
    // Only resolve the user over the network when the server did not seed it.
    if (!hasInitial) {
      supabase.auth.getUser().then(({ data: { user: u } }) => {
        setUser(u ?? null);
        setLoading(false);
      });
    }

    // Keep state in sync whenever the session changes (sign in / sign out /
    // token refresh).
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
    // hasInitial is derived from the initialUser prop, which is fixed for the
    // provider's lifetime; this effect intentionally runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
