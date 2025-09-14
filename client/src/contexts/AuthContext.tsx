import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

/** ===== Tipos ===== */
interface UserFeatures {
  habits: boolean;
  training: boolean;
  nutrition: boolean;
  meditation: boolean;
  active_breaks: boolean;
}

export interface User {
  id: string;            // UUID Supabase
  email: string;
  full_name: string;
  role: string;          // 'admin' | 'user' | otro
  plan_type?: string | null;
  features: UserFeatures;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  assignPlan: (planId: number) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

/** ===== Helpers ===== */

function parseFeatures(raw: unknown): UserFeatures {
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
    // defaults conservadores
    return { habits: true, training: true, nutrition: true, meditation: true, active_breaks: true };
  }
}

function coalesceName(u: { user_metadata?: any } | null, row?: any): string {
  return (
    row?.full_name ??
    u?.user_metadata?.full_name ??
    u?.user_metadata?.name ??
    ''
  );
}

/** Carga perfil desde public.users (fallback a public.profiles) */
async function fetchProfile(uid: string) {
  const q1 = await supabase.from('users').select('*').eq('id', uid).single();
  if (!q1.error && q1.data) return { row: q1.data, table: 'users' as const };

  const q2 = await supabase.from('profiles').select('*').eq('id', uid).single();
  if (!q2.error && q2.data) return { row: q2.data, table: 'profiles' as const };

  return { row: null, table: null as const };
}

/** Mapea datos Supabase -> User del contexto */
async function hydrateUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.warn('[Auth] getUser error:', error.message);
    return null;
  }
  const sUser = data?.user;
  if (!sUser) return null;

  const prof = await fetchProfile(sUser.id);

  const role =
    (prof.row?.role as string) ??
    (prof.row?.is_admin ? 'admin' : 'user');

  const features = parseFeatures(prof.row?.features_json ?? prof.row?.features);

  const u: User = {
    id: sUser.id,
    email: sUser.email ?? '',
    full_name: coalesceName(sUser, prof.row),
    role,
    plan_type: prof.row?.plan_type ?? null,
    features,
  };
  return u;
}

/** ===== Provider ===== */

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Inicialización + listener
  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const u = await hydrateUser();
        if (mounted) setUser(u);
      } catch (e) {
        console.warn('[Auth] init error:', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      try {
        if (session?.user) {
          const u = await hydrateUser();
          setUser(u);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.warn('[Auth] onAuthStateChange error:', e);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  /** === Acciones === */

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      const u = await hydrateUser();
      setUser(u);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) throw error;
      const u = await hydrateUser();
      setUser(u);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'com.outdoorteam.app://auth/callback' }, // preparado para móvil
    });
  };

  const assignPlan = async (planId: number) => {
    if (!user) throw new Error('No user');
    const { error } = await supabase.from('users').update({ plan_type: String(planId) }).eq('id', user.id);
    if (error) throw error;
    const u = await hydrateUser();
    setUser(u);
  };

  const refreshUser = async () => {
    const u = await hydrateUser();
    setUser(u);
  };

  const value: AuthContextType = React.useMemo(
    () => ({ user, isLoading, login, register, logout, loginWithGoogle, assignPlan, refreshUser }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
