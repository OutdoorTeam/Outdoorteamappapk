import * as React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { loginSchema, LoginFormData } from '../../shared/validation-schemas';
import { apiRequest, parseApiError, getErrorMessage, isAuthError, focusFirstInvalidField } from '@/utils/error-handling';
import { Eye, EyeOff } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const from = (location.state as any)?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur'
  });

  React.useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate(from === '/login' ? '/dashboard' : from);
      }
    }
  }, [user, navigate, from]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await apiRequest<{ user: any; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      localStorage.setItem('auth_token', response.token);
      
      toast({
        title: "Inicio de sesión exitoso",
        description: `Bienvenido ${response.user.full_name}`,
        variant: "success",
      });

      // The useEffect will handle navigation based on user role
      window.location.reload(); // Force reload to update auth context
    } catch (error) {
      const apiError = parseApiError(error);
      
      if (isAuthError(apiError)) {
        setError('email', { message: 'Credenciales inválidas' });
        setError('password', { message: 'Credenciales inválidas' });
      } else {
        toast({
          title: "Error al iniciar sesión",
          description: getErrorMessage(apiError),
          variant: "destructive",
        });
      }

      focusFirstInvalidField();
    }
  };

  const handleGoogleLogin = async () => {
    toast({
      title: "Función no disponible",
      description: "El login con Google aún no está implementado. Por favor usa email y contraseña.",
      variant: "warning",
    });
  };

  const handleFillAdminCredentials = () => {
    setValue('email', 'franciscodanielechs@gmail.com');
    setValue('password', 'admin123');
  };

  const handleTestAdmin = async () => {
    try {
      const response = await fetch('/api/test/admin-user');
      const data = await response.json();
      toast({
        title: "Test de usuario admin",
        description: `Estado: ${data.message}`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error en test",
        description: "No se pudo verificar el usuario admin",
        variant: "destructive",
      });
    }
  };

  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Redirigiendo...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Bienvenido de Vuelta</CardTitle>
            <CardDescription className="text-center">
              Inicia sesión en tu cuenta de Outdoor Team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ingresa tu correo electrónico"
                  {...register('email')}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.email}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-600" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ingresa tu contraseña"
                    {...register('password')}
                    disabled={isSubmitting}
                    aria-invalid={!!errors.password}
                    className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    </span>
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600" role="alert">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>

            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    O continúa con
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full mt-4"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
              >
                Continuar con Google
              </Button>
            </div>

            <div className="mt-4 text-center text-sm">
              <Link to="#" className="text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <div className="mt-6 text-center text-sm">
              ¿No tienes una cuenta?{' '}
              <Link to="/register" className="text-primary hover:underline">
                Regístrate
              </Link>
            </div>

            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-600 mb-2">Credenciales de administrador:</p>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFillAdminCredentials}
                  disabled={isSubmitting}
                >
                  Usar credenciales admin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestAdmin}
                  disabled={isSubmitting}
                >
                  Verificar usuario admin
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
