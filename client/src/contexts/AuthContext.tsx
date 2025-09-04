
import * as React from 'react';
import { useCurrentUser, useLogin, useRegister, useLogout } from '@/hooks/api/use-auth';
import { useToast } from '@/hooks/use-toast';
import { parseApiError, getErrorMessage, getFieldErrors, setFormErrors, focusFirstInvalidField } from '@/utils/error-handling';

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
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: any, setError: any) => Promise<void>;
  register: (userData: any, setError: any) => Promise<void>;
  logout: () => void;
  loginWithGoogle: () => Promise<void>;
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
  const { data: user, isLoading: isUserLoading, refetch: refreshUser } = useCurrentUser();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const performLogout = useLogout();
  const { toast } = useToast();

  const login = async (credentials: any, setError: any) => {
    try {
      await loginMutation.mutateAsync(credentials);
      toast({
        title: "Inicio de sesión exitoso",
        description: `Bienvenido de nuevo`,
        variant: "success",
      });
    } catch (error) {
      const apiError = parseApiError(error);
      const fieldErrors = getFieldErrors(apiError);
      
      if (Object.keys(fieldErrors).length > 0) {
        setFormErrors(setError, fieldErrors);
      } else {
        setError('email', { message: 'Credenciales inválidas' });
        setError('password', { message: 'Credenciales inválidas' });
        toast({
          title: "Error al iniciar sesión",
          description: getErrorMessage(apiError),
          variant: "destructive",
        });
      }
      focusFirstInvalidField();
    }
  };

  const register = async (userData: any, setError: any) => {
    try {
      await registerMutation.mutateAsync(userData);
      toast({
        title: "Registro exitoso",
        description: `¡Bienvenido! Tu cuenta ha sido creada.`,
        variant: "success",
      });
    } catch (error) {
      const apiError = parseApiError(error);
      const fieldErrors = getFieldErrors(apiError);
      
      if (Object.keys(fieldErrors).length > 0) {
        setFormErrors(setError, fieldErrors);
      } else {
        toast({
          title: "Error en el registro",
          description: getErrorMessage(apiError),
          variant: "destructive",
        });
      }
      focusFirstInvalidField();
    }
  };

  const logout = () => {
    performLogout();
  };

  const loginWithGoogle = async () => {
    toast({
      title: "Función no disponible",
      description: "El login con Google aún no está implementado.",
      variant: "warning",
    });
  };

  const value = React.useMemo(() => ({
    user: user || null,
    isLoading: isUserLoading,
    login,
    register,
    logout,
    loginWithGoogle,
    refreshUser,
  }), [user, isUserLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
