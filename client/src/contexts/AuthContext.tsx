import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

interface UserFeatures {
  habits: boolean;
  training: boolean;
  nutrition: boolean;
  meditation: boolean;
  active_breaks: boolean;
}

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  plan_type?: string | null;
  features: UserFeatures;
}

type AuthContextShape = {
  user: AppUser | null;
  initialized: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: any | null }>;
  logout: () => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  assignPlan: (planId: number) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextShape | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

const parseFeatures = (raw: unknown): UserFeatures => {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {});
    return {
      habits: !!(data as any).habits,
      training: !!(data as any).training,
      nutrition: !!(data as any).nutrition,
      meditation: !!(data as any).meditation,
      active_breaks: !!(data as any).active_breaks,
    };
  } catch {
    return { habits: true, training: true, nutrition: true, meditation: true, active_breaks: true };
  }
};

const coalesceName = (u: SupabaseAuthUser | null, row?: any): string =>
  row?.full_name ?? u?.user_metadata?.full_name ?? u?.user_metadata?.name ?? '';

const fetchProfile = async (uid: string) => {
  const fromUsers = await supabase.from('users').select('*').eq('id', uid).single();
  if (!fromUsers.error && fromUsers.data) return { row: fromUsers.data };

  const fromProfiles = await supabase.from('profiles').select('*').eq('id', uid).single();
  if (!fromProfiles.error && fromProfiles.data) return { row: fromProfiles.data };

  return { row: null };
};

const tryRehydrateFromLocalStorage = async (): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') return false;

    const raw = window.localStorage.getItem('ot-auth');
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    const sess = parsed?.currentSession ?? parsed?.session ?? parsed;

    const access_token = sess?.access_token ?? sess?.accessToken ?? null;
    const refresh_token = sess?.refresh_token ?? sess?.refreshToken ?? null;

    if (access_token && refresh_token) {
      const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
      console.log('[AUTH Fallback] setSession', {
        ok: !error,
        user: data?.user?.id,
        error: error?.message,
      });
      return !error;
    }
  } catch (e) {
    console.warn('[AUTH Fallback] parse error', e);
  }

  return false;
};

const hydrateUser = async (sessionUser: SupabaseAuthUser | null): Promise<AppUser | null> => {
  if (!sessionUser) return null;
  const profile = await fetchProfile(sessionUser.id);

  const role = (profile.row?.role as string) ?? (profile.row?.is_admin ? 'admin' : 'user');

  return {
    id: sessionUser.id,
    email: sessionUser.email ?? '',
    full_name: coalesceName(sessionUser, profile.row),
    role,
    plan_type: profile.row?.plan_type ?? null,
    features: parseFeatures(profile.row?.features_json ?? profile.row?.features),
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let sub: { subscription: { unsubscribe(): void } } | undefined;

    (async () => {
      try {
        await tryRehydrateFromLocalStorage();

        const { data, error } = await supabase.auth.getSession();
        if (!active) return;

        if (error) {
          console.warn('[Auth] getSession error', error.message);
          setInitialized(true);
          return;
        }

        if (data.session?.user) {
          const hydrated = await hydrateUser(data.session.user);
          if (active) setUser(hydrated);
        } else {
          setUser(null);
        }

        setInitialized(true);

        const res = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('[AUTH EVENT]', event, !!session, session?.user?.id);

          if (!active) return;
          if (session?.user) {
            const hydrated = await hydrateUser(session.user);
            setUser(hydrated);
          } else {
            setUser(null);
          }
        });

        sub = res.data;
      } catch (error) {
        console.warn('[Auth] init unexpected error', error);
        setInitialized(true);
      }
    })();

    return () => {
      active = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      console.log('[signIn]', { error: error?.message, user: data?.user?.id });
      if (error) {
        return { error };
      }

      if (data?.user) {
        const hydrated = await hydrateUser(data.user);
        setUser(hydrated);
      }

      return { error: null };
    } catch (error: any) {
      console.error('[signIn] unexpected error', error);
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      console.log('[logout] signOut called');
      await supabase.auth.signOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) throw error;

      if (data?.user) {
        const hydrated = await hydrateUser(data.user);
        setUser(hydrated);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const assignPlan = async (planId: number) => {
    if (!user) return;
    await supabase.from('users').update({ plan_type: String(planId) }).eq('id', user.id);
    await refreshUser();
  };

  const refreshUser = async () => {
    const { data } = await supabase.auth.getSession();
    const hydrated = await hydrateUser(data.session?.user ?? null);
    setUser(hydrated);
  };

  return (
    <AuthContext.Provider
      value={{ user, initialized, isLoading, login, logout, register, assignPlan, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};
