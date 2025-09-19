import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { buildAccessModel, type AccessFeatures, type AccessModel } from '@/lib/userAccess';

export type UserFeatures = AccessFeatures;

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  plan_type: string | null;
  features: UserFeatures;
  avatar_url: string | null;
  access: AccessModel;
}

type AuthContextShape = {
  user: AppUser | null;
  initialized: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: any | null }>;
  logout: () => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  assignPlan: (planId: string | null) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextShape | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
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

const loadAccessModel = async (sessionUser: SupabaseAuthUser): Promise<AccessModel> => {
  const userPromise = supabase.from('users').select('*').eq('id', sessionUser.id).maybeSingle();
  const profilePromise = supabase.from('profiles').select('*').eq('id', sessionUser.id).maybeSingle();
  const entitlementPromise = supabase
    .from('entitlements')
    .select('*')
    .eq('user_id', sessionUser.id)
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  const [{ data: userRow, error: userError }, { data: profileRow, error: profileError }, entitlementResponse] =
    await Promise.all([userPromise, profilePromise, entitlementPromise]);

  if (userError && userError.code !== 'PGRST116') {
    console.warn('[Auth] user fetch error', userError.message);
  }
  if (profileError && profileError.code !== 'PGRST116') {
    console.warn('[Auth] profile fetch error', profileError.message);
  }

  let planRow = null;
  const subscriptionPlanId = userRow?.subscription_plan_id ?? null;
  if (subscriptionPlanId) {
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', subscriptionPlanId)
      .maybeSingle();
    if (planError && planError.code !== 'PGRST116') {
      console.warn('[Auth] subscription plan fetch error', planError.message);
    }
    planRow = planData ?? null;
  }

  const entitlementRow = entitlementResponse.error ? null : entitlementResponse.data ?? null;

  return buildAccessModel({
    user: userRow ?? null,
    profile: profileRow ?? null,
    plan: planRow,
    entitlement: entitlementRow,
    fallbackEmail: sessionUser.email ?? undefined,
    fallbackId: sessionUser.id,
  });
};

const hydrateUser = async (sessionUser: SupabaseAuthUser | null): Promise<AppUser | null> => {
  if (!sessionUser) return null;
  const access = await loadAccessModel(sessionUser);
  return {
    id: access.id,
    email: access.email,
    full_name: access.displayName,
    role: access.role,
    plan_type: access.plan.name,
    features: access.features,
    avatar_url: access.avatarUrl,
    access,
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

  const assignPlan = async (planId: string | null) => {
    if (!user) return;
    await supabase.from('users').update({ subscription_plan_id: planId }).eq('id', user.id);
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
