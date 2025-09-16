import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { loginSchema, type LoginFormData } from '../../../shared/validation-schemas';
import { Eye, EyeOff } from 'lucide-react';

const DISABLE_API = import.meta.env.VITE_DISABLE_API === 'true';

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { user, initialized, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  React.useEffect(() => {
    if (!initialized || !user) return;

    const fallback = DISABLE_API ? '/account-debug' : '/dashboard';
    if (user.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }

    navigate(from === '/login' ? fallback : from, { replace: true });
  }, [initialized, user, navigate, from]);

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const { error } = await login(data.email, data.password);
      if (error) {
        const message = error.message || 'Credenciales invalidas';
        setError('email', { message });
        setError('password', { message });
        toast({
          title: 'Error al iniciar sesion',
          description: message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Inicio de sesion exitoso',
        description: 'Bienvenido',
        variant: 'success',
      });
    } catch (err: any) {
      const message = err?.message || 'Credenciales invalidas';
      setError('email', { message });
      setError('password', { message });
      toast({
        title: 'Error al iniciar sesion',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

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
            <CardTitle className="text-2xl text-center">Bienvenido de vuelta</CardTitle>
            <CardDescription className="text-center">
              Inicia sesion en tu cuenta de Outdoor Team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Correo electronico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ingresa tu correo electronico"
                  {...register('email')}
                  disabled={loading}
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
                <Label htmlFor="password">Contrasena</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ingresa tu contrasena"
                    {...register('password')}
                    disabled={loading}
                    aria-invalid={!!errors.password}
                    className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">
                      {showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                    </span>
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600" role="alert">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Iniciando sesion...' : 'Iniciar sesion'}
              </Button>
            </form>

            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">O continua con</span>
                </div>
              </div>
              <Button type="button" variant="outline" className="w-full mt-4" disabled>
                Continuar con Google (pronto)
              </Button>
            </div>

            <div className="mt-4 text-center text-sm">
              <Link to="#" className="text-primary hover:underline">
                Olvidaste tu contrasena?
              </Link>
            </div>

            <div className="mt-6 text-center text-sm">
              No tienes una cuenta?{' '}
              <Link to="/register" className="text-primary hover:underline">
                Registrate
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
