
import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useUserStats } from '@/hooks/api/use-user-stats';
import WeeklyPointsChart from '@/components/profile/WeeklyPointsChart';
import MonthlyHabitsChart from '@/components/profile/MonthlyHabitsChart';
import HabitCompletionDonut from '@/components/profile/HabitCompletionDonut';
import StatsSummary from '@/components/profile/StatsSummary';
import NotificationSettings from '@/components/profile/NotificationSettings';
import { User, Mail, Calendar, Crown, Star, Activity, BarChart3, Bell, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, parseApiError, getErrorMessage } from '@/utils/error-handling';

const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { data: userStats, isLoading: statsLoading, error: statsError } = useUserStats(user?.id);
  const { toast } = useToast();
  const createdAt = user?.access.raw.user?.created_at ?? null;
  const habitCompletion = {
    training: userStats?.habit_completion?.training ?? 0,
    nutrition: userStats?.habit_completion?.nutrition ?? 0,
    movement: userStats?.habit_completion?.movement ?? 0,
    meditation: userStats?.habit_completion?.meditation ?? 0,
  };
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 8 caracteres", variant: "destructive" });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      toast({ title: "Éxito", description: "Tu contraseña ha sido actualizada.", variant: "success" });
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      const apiError = parseApiError(error);
      toast({ title: "Error", description: getErrorMessage(apiError), variant: "destructive" });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const getSubscriptionStatus = () => {
    if (!user?.plan_type) return 'Sin plan';
    return 'Activo';
  };

  const getSubscriptionColor = () => {
    const status = getSubscriptionStatus();
    if (status === 'Activo') return 'text-green-600';
    if (status === 'Sin plan') return 'text-gray-500';
    return 'text-yellow-600';
  };

  const getPlanIcon = () => {
    if (!user?.plan_type) return <User className="w-5 h-5" />;
    if (user.plan_type === 'Programa Totum') return <Crown className="w-5 h-5 text-purple-600" />;
    if (user.plan_type.includes('Entrenamiento Personalizado')) return <Star className="w-5 h-5 text-blue-600" />;
    return <Activity className="w-5 h-5 text-green-600" />;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando perfil...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mi Perfil</h1>
        <p className="text-muted-foreground">Información de tu cuenta, estadísticas y configuración</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Información Personal
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Estadísticas
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notificaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Información Personal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nombre Completo</Label>
                      <Input id="fullName" value={user.full_name} disabled className="bg-gray-50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <Input id="email" type="email" value={user.email} disabled className="bg-gray-50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Registro</Label>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-600">{createdAt ? new Date(createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getPlanIcon()}
                    Plan de Suscripción
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Plan Actual</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium">{user.plan_type || 'Sin plan asignado'}</div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Estado</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                        <span className={`font-medium ${getSubscriptionColor()}`}>{getSubscriptionStatus()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Label className="text-sm font-medium mb-3 block">Características Activas</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(user.features || {}).map(([key, enabled]) => (
                        <div key={key} className={`p-2 rounded-lg text-sm text-center border ${enabled ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                          {key === 'habits' && 'Hábitos'}
                          {key === 'training' && 'Entrenamiento'}
                          {key === 'nutrition' && 'Nutrición'}
                          {key === 'meditation' && 'Meditación'}
                          {key === 'active_breaks' && 'Pausas Activas'}
                        </div>
                      ))}
                    </div>
                  </div>
                  {!user.plan_type && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800 text-sm mb-2">¡No tienes un plan asignado aún!</p>
                      <Button onClick={() => window.location.href = '/plan-selection'} className="bg-blue-600 hover:bg-blue-700 text-white">Seleccionar Plan</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Seguridad</CardTitle>
                  <CardDescription>Gestiona la seguridad de tu cuenta</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Nueva Contraseña</Label>
                      <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nueva contraseña" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                      <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar nueva contraseña" />
                    </div>
                    <Button type="submit" disabled={isUpdatingPassword || !password || password !== confirmPassword}>
                      <KeyRound className="w-4 h-4 mr-2" />
                      {isUpdatingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          {statsLoading ? (
            <div className="flex items-center justify-center min-h-[400px]"><div className="text-lg">Cargando estadísticas...</div></div>
          ) : statsError ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Card className="p-6 text-center">
                <CardTitle className="text-red-600 mb-2">Error al cargar estadísticas</CardTitle>
                <CardDescription>No se pudieron cargar las estadísticas. Por favor, intenta nuevamente.</CardDescription>
                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Reintentar</Button>
              </Card>
            </div>
          ) : !userStats ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Card className="p-6 text-center">
                <CardTitle className="mb-2">No hay datos disponibles</CardTitle>
                <CardDescription>Comienza a usar la aplicación para ver tus estadísticas aquí.</CardDescription>
                <Button className="mt-4" onClick={() => window.location.href = '/dashboard'}>Ir al Dashboard</Button>
              </Card>
            </div>
          ) : (
            <>
              <StatsSummary weeklyStats={{ totalPoints: userStats.weekly_points, totalSteps: userStats.average_steps * 7, totalMeditationSessions: 0, totalMeditationMinutes: 0, averageDailyPoints: userStats.average_daily_points }} monthlyStats={{ totalPoints: userStats.weekly_points * 4, totalSteps: userStats.average_steps * 30, totalMeditationSessions: 0, totalMeditationMinutes: 0 }} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <WeeklyPointsChart data={userStats.weekly_data?.map(day => ({ ...day, steps: userStats.average_steps, meditationSessions: 0, meditationMinutes: 0 })) || []} />
                <HabitCompletionDonut data={habitCompletion} />
              </div>
                            <MonthlyHabitsChart
                data={[
                  {
                    name: "Entrenamiento",
                    completed: Math.round((habitCompletion.training / 100) * (userStats.total_active_days ?? 0)),
                    total: userStats.total_active_days ?? 0,
                    percentage: Math.round(habitCompletion.training),
                  },
                  {
                    name: "Nutrici�n",
                    completed: Math.round((habitCompletion.nutrition / 100) * (userStats.total_active_days ?? 0)),
                    total: userStats.total_active_days ?? 0,
                    percentage: Math.round(habitCompletion.nutrition),
                  },
                  {
                    name: "Movimiento",
                    completed: Math.round((habitCompletion.movement / 100) * (userStats.total_active_days ?? 0)),
                    total: userStats.total_active_days ?? 0,
                    percentage: Math.round(habitCompletion.movement),
                  },
                  {
                    name: "Meditaci�n",
                    completed: Math.round((habitCompletion.meditation / 100) * (userStats.total_active_days ?? 0)),
                    total: userStats.total_active_days ?? 0,
                    percentage: Math.round(habitCompletion.meditation),
                  },
                ]}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Puntos Totales</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-primary">{userStats.weekly_points * 4 || 0}</div><div className="text-xs text-muted-foreground">Últimos 30 días</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pasos Promedio</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{userStats.average_steps?.toLocaleString() || 0}</div><div className="text-xs text-muted-foreground">Por día</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Días Activos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-purple-600">{userStats.total_active_days || 0}</div><div className="text-xs text-muted-foreground">Total registrados</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Tasa Completitud</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{Math.round(userStats.completion_rate) || 0}%</div><div className="text-xs text-muted-foreground">Promedio general</div></CardContent></Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;




