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
import { User, Mail, Calendar, Crown, Star, Activity, BarChart3, Bell } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { data: userStats, isLoading: statsLoading, error: statsError } = useUserStats(user?.id || 0);

  const getSubscriptionStatus = () => {
    if (!user?.plan_type) return 'Sin plan';
    
    // Since we don't have subscription status in the database, we'll show active for any plan
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
            {/* Profile Information */}
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
                      <Input
                        id="fullName"
                        value={user.full_name}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user.email}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Rol</Label>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                        {user.role === 'admin' ? (
                          <>
                            <Crown className="w-4 h-4 text-red-600" />
                            <span className="text-red-600 font-medium">Administrador</span>
                          </>
                        ) : (
                          <>
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="text-blue-600 font-medium">Usuario</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Fecha de Registro</Label>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                        <Calendar className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-600">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Plan Information */}
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
                        <div className="font-medium">
                          {user.plan_type || 'Sin plan asignado'}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Estado</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                        <span className={`font-medium ${getSubscriptionColor()}`}>
                          {getSubscriptionStatus()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mt-6">
                    <Label className="text-sm font-medium mb-3 block">Características Activas</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(user.features || {}).map(([key, enabled]) => (
                        <div
                          key={key}
                          className={`p-2 rounded-lg text-sm text-center border ${
                            enabled 
                              ? 'bg-green-50 border-green-200 text-green-800' 
                              : 'bg-gray-50 border-gray-200 text-gray-500'
                          }`}
                        >
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
                      <p className="text-blue-800 text-sm mb-2">
                        ¡No tienes un plan asignado aún!
                      </p>
                      <Button 
                        onClick={() => window.location.href = '/plan-selection'}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Seleccionar Plan
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Basic Statistics */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resumen</CardTitle>
                  <CardDescription>Tu actividad reciente</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {statsLoading ? (
                    <div className="text-center py-4">
                      <div className="text-sm text-muted-foreground">Cargando estadísticas...</div>
                    </div>
                  ) : statsError ? (
                    <div className="text-center py-4">
                      <div className="text-sm text-red-600">Error al cargar estadísticas</div>
                    </div>
                  ) : userStats ? (
                    <>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">{userStats.weekly_points || 0}</div>
                        <div className="text-sm text-muted-foreground">Puntos esta semana</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{userStats.average_steps.toLocaleString() || 0}</div>
                        <div className="text-sm text-muted-foreground">Pasos promedio</div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-sm text-muted-foreground">No hay datos disponibles</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Acciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => window.location.href = '/plans'}
                  >
                    Ver Planes Disponibles
                  </Button>
                  
                  {user.plan_type && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = '/dashboard'}
                    >
                      Ir al Dashboard
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => refreshUser()}
                  >
                    Actualizar Información
                  </Button>
                </CardContent>
              </Card>

              {/* Account Security */}
              <Card>
                <CardHeader>
                  <CardTitle>Seguridad</CardTitle>
                  <CardDescription>Gestiona la seguridad de tu cuenta</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cambiar contraseña</span>
                      <Button variant="outline" size="sm" disabled>
                        Próximamente
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Verificación de email</span>
                      <span className="text-xs text-green-600">✓ Verificado</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          {statsLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-lg">Cargando estadísticas...</div>
            </div>
          ) : statsError ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Card className="p-6 text-center">
                <CardTitle className="text-red-600 mb-2">Error al cargar estadísticas</CardTitle>
                <CardDescription>
                  No se pudieron cargar las estadísticas. Por favor, intenta nuevamente.
                </CardDescription>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  Reintentar
                </Button>
              </Card>
            </div>
          ) : !userStats ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Card className="p-6 text-center">
                <CardTitle className="mb-2">No hay datos disponibles</CardTitle>
                <CardDescription>
                  Comienza a usar la aplicación para ver tus estadísticas aquí.
                </CardDescription>
                <Button 
                  className="mt-4"
                  onClick={() => window.location.href = '/dashboard'}
                >
                  Ir al Dashboard
                </Button>
              </Card>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <StatsSummary 
                weeklyStats={{
                  totalPoints: userStats.weekly_points,
                  totalSteps: userStats.average_steps * 7,
                  totalMeditationSessions: 0,
                  totalMeditationMinutes: 0,
                  averageDailyPoints: userStats.average_daily_points
                }}
                monthlyStats={{
                  totalPoints: userStats.weekly_points * 4,
                  totalSteps: userStats.average_steps * 30,
                  totalMeditationSessions: 0,
                  totalMeditationMinutes: 0
                }}
              />

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Points Chart */}
                <WeeklyPointsChart data={userStats.weekly_data?.map(day => ({
                  ...day,
                  steps: userStats.average_steps,
                  meditationSessions: 0,
                  meditationMinutes: 0
                })) || []} />

                {/* Habit Completion Donut */}
                <HabitCompletionDonut data={userStats.habit_completion || {}} />
              </div>

              {/* Monthly Habits Chart - Full Width */}
              <MonthlyHabitsChart data={[
                { 
                  name: 'Entrenamiento', 
                  completed: Math.round((userStats.habit_completion?.training / 100 || 0) * userStats.total_active_days),
                  total: userStats.total_active_days,
                  percentage: Math.round(userStats.habit_completion?.training || 0)
                },
                { 
                  name: 'Nutrición', 
                  completed: Math.round((userStats.habit_completion?.nutrition / 100 || 0) * userStats.total_active_days),
                  total: userStats.total_active_days,
                  percentage: Math.round(userStats.habit_completion?.nutrition || 0)
                },
                { 
                  name: 'Movimiento', 
                  completed: Math.round((userStats.habit_completion?.movement / 100 || 0) * userStats.total_active_days),
                  total: userStats.total_active_days,
                  percentage: Math.round(userStats.habit_completion?.movement || 0)
                },
                { 
                  name: 'Meditación', 
                  completed: Math.round((userStats.habit_completion?.meditation / 100 || 0) * userStats.total_active_days),
                  total: userStats.total_active_days,
                  percentage: Math.round(userStats.habit_completion?.meditation || 0)
                }
              ]} />

              {/* Additional Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Puntos Totales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{userStats.weekly_points * 4 || 0}</div>
                    <div className="text-xs text-muted-foreground">Últimos 30 días</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Pasos Promedio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {userStats.average_steps?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Por día</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Días Activos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {userStats.total_active_days || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Total registrados</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Tasa Completitud</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(userStats.completion_rate) || 0}%
                    </div>
                    <div className="text-xs text-muted-foreground">Promedio general</div>
                  </CardContent>
                </Card>
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
