import * as React from 'react';

interface UserFeatures {
  habits: boolean;
  training: boolean;
  nutrition: boolean;
  meditation: boolean;
  active_breaks: boolean;
}

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  plan_type?: string | null;
  features: UserFeatures;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loginWithGoogle: () => Promise<void>;
  assignPlan: (planId: number) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      console.log('Checking auth status with stored token');
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('Auth check successful for:', userData.email, 'Plan:', userData.plan_type, 'Features:', userData.features);
        setUser(userData);
      } else {
        console.log('Auth check failed, removing token');
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('User data refreshed:', userData.email, 'Plan:', userData.plan_type);
        setUser(userData);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const login = async (email: string, password: string) => {
    console.log('Attempting login for:', email);
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: email.trim(), 
        password 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Login failed:', data.error);
      throw new Error(data.error || 'Error al iniciar sesión');
    }

    if (data.token && data.user) {
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      console.log('Login successful for user:', data.user.email, 'Role:', data.user.role, 'Plan:', data.user.plan_type);
    } else {
      throw new Error('Respuesta de login inválida');
    }
  };

  const register = async (fullName: string, email: string, password: string) => {
    console.log('Attempting registration for:', email);
    
    if (!fullName.trim()) {
      throw new Error('El nombre completo es requerido');
    }

    if (!email.trim()) {
      throw new Error('El correo electrónico es requerido');
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        full_name: fullName.trim(), 
        email: email.trim(), 
        password 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Registration failed:', data.error);
      throw new Error(data.error || 'Error al registrarse');
    }

    if (data.token && data.user) {
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      console.log('Registration successful for user:', data.user.email, 'Role:', data.user.role, 'Plan:', data.user.plan_type);
    } else {
      throw new Error('Respuesta de registro inválida');
    }
  };

  const assignPlan = async (planId: number) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    console.log('Assigning plan', planId, 'to user', user.id);

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/users/${user.id}/assign-plan`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ planId }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Plan assignment failed:', data.error);
      throw new Error(data.error || 'Error al asignar plan');
    }

    setUser(data);
    console.log('Plan assigned successfully:', data.plan_type);
  };

  const logout = () => {
    console.log('Logging out user:', user?.email);
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  const loginWithGoogle = async () => {
    console.log('Google login clicked - to be implemented');
    throw new Error('Login con Google aún no está implementado. Por favor usa email y contraseña.');
  };

  const value = React.useMemo(() => ({
    user,
    isLoading,
    login,
    register,
    logout,
    loginWithGoogle,
    assignPlan,
    refreshUser,
  }), [user, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
