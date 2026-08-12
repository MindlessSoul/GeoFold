import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { DEMO_MODE } from './config';
import { supabase } from './supabase';

const DEMO_SESSION = { user: { email: 'demo@geofold.app' } } as unknown as Session;

interface AuthValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Resolves true when the project requires email confirmation before the account can be used. */
  signUp: (
    email: string,
    password: string,
    profile: { name: string; org: string },
  ) => Promise<boolean>;
  signOut: () => Promise<void>;
  /** Demo mode only: step into the sample-data session shown behind the sign-in screen. */
  enterDemo: () => void;
}

const AuthContext = createContext<AuthValue>({
  session: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => false,
  signOut: async () => {},
  enterDemo: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Demo mode has nothing to restore, so it starts resolved and signed out — the sign-in screen is
  // meant to be visible, and "Continue" steps into the demo from there.
  const [loading, setLoading] = useState(!DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) return;

    let cancelled = false;
    const settle = (next: Session | null) => {
      if (cancelled) return;
      setSession(next);
      setLoading(false);
    };

    // Startup is held behind `loading` — the splash stays up until it clears — so this must clear
    // on every path. A rejected getSession (bad URL, wrong key) or one that simply never settles
    // (no route to the host, captive portal) would otherwise leave the app on the splash screen
    // forever, rendering nothing and logging nothing.
    const timeout = setTimeout(() => settle(null), 8000);

    supabase.auth
      .getSession()
      .then(({ data }) => settle(data.session))
      .catch(() => settle(null))
      .finally(() => clearTimeout(timeout));

    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (DEMO_MODE) {
      setSession(DEMO_SESSION);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(error.message);
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, profile: { name: string; org: string }) => {
      if (DEMO_MODE) {
        setSession(DEMO_SESSION);
        return false;
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: profile.name.trim(), organization: profile.org.trim() } },
      });
      if (error) throw new Error(error.message);
      // Projects with email confirmation on return a user but no session; the caller tells the
      // surveyor to go and confirm rather than dropping them on a screen that cannot load.
      return !data.session;
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (DEMO_MODE) {
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const enterDemo = useCallback(() => setSession(DEMO_SESSION), []);

  const value = useMemo(
    () => ({ session, loading, signIn, signUp, signOut, enterDemo }),
    [session, loading, signIn, signUp, signOut, enterDemo],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
