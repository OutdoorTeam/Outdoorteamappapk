import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { registerSchema, RegisterFormData } from '../../../shared/validation-schemas';
import { apiRequest, parseApiError, getErrorMessage, getFieldErrors, focusFirstInvalidField, setFormErrors } from '@/utils/error-handling';
import { Eye, EyeOff } from 'lucide-react';

const RegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
    setValue
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur'
  });

  const acceptTos = watch('acceptTos');

  React.useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const { acceptTos, confirmPassword, ...registrationData } = data;
      
      const response = await apiRequest<{ user: any; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(registrationData),
      });

      localStorage.setItem('auth_token', response.token);
      
      toast({
        title: "Registro exitoso",
        description: `¡Bienvenido ${response.user.full_name}! Tu cuenta ha sido creada.`,
        variant: "success",
      });

      // Force reload to update auth context
      window.location.reload();
    } catch (error) {
      const apiError = parseApiError(error);
      const fieldErrors = getFieldErrors(apiError);
      
      if (Object.keys(fieldErrors).length > 0) {
        setFormErrors(setError, fieldErrors);
        focusFirstInvalidField();
      } else {
        toast({
          title: "Error en el registro",
          description: getErrorMessage(apiError),
          variant: "destructive",
        });
      }
    }
  };

  const handleGoogleRegister = async () => {
    toast({
      title: "Función no disponible",
      description: "El registro con Google aún no está implementado. Por favor usa el formulario.",
      variant: "warning",
    });
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
            <CardTitle className="text-2xl text-center">Únete a Outdoor Team</CardTitle>
            <CardDescription className="text-center">
              Crea tu cuenta para comenzar tu viaje saludable
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre Completo</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Ingresa tu nombre completo"
                  {...register('full_name')}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.full_name}
                  className={errors.full_name ? 'border-red-500' : ''}
                />
                {errors.full_name && (
                  <p className="text-sm text-red-600" role="alert">
                    {errors.full_name.message}
                  </p>
                )}
              </div>

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
                    placeholder="Crea una contraseña"
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
                <p className="text-xs text-muted-foreground">
                  La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas y números.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirma tu contraseña"
                    {...register('confirmPassword')}
                    disabled={isSubmitting}
                    aria-invalid={!!errors.confirmPassword}
                    className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    </span>
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600" role="alert">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acceptTos"
                  checked={acceptTos}
                  onCheckedChange={(checked) => setValue('acceptTos', !!checked)}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.acceptTos}
                />
                <Label 
                  htmlFor="acceptTos" 
                  className={`text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                    errors.acceptTos ? 'text-red-600' : ''
                  }`}
                >
                  Acepto los{' '}
                  <Link to="/terms" className="text-primary hover:underline">
                    términos y condiciones
                  </Link>{' '}
                  y la{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
                    política de privacidad
                  </Link>
                </Label>
              </div>
              {errors.acceptTos && (
                <p className="text-sm text-red-600" role="alert">
                  {errors.acceptTos.message}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creando Cuenta...' : 'Crear Cuenta'}
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
                onClick={handleGoogleRegister}
                disabled={isSubmitting}
              >
                Continuar con Google
              </Button>
            </div>

            <div className="mt-4 text-center text-sm">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Iniciar sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
