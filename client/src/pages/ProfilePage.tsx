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
import StepSyncSettings from '@/components/profile/StepSyncSettings';
import { User, Mail, Calendar, Crown, Star, Activity, BarChart3, Smartphone } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { data: userStats, isLoading: statsLoading } = useUserStats();

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mi Perfil</h1>
        <p className="text-muted-foreground">
          Gestiona tu información personal, estadísticas y configuraciones
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Estadísticas</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Notificaciones</span>
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Sincronización</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Información Personal
                </CardTitle>
                <CardDescription>
                  Tu información básica y detalles de la cuenta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Nombre Completo</Label>
                  <Input
                    id="full-name"
                    value={user.full_name}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={user.email}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="member-since">Miembro Desde</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <Input
                      id="member-since"
                      value={new Date(user.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>

                {user.role === 'admin' && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Crown className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">
                      Cuenta de Administrador
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Plan Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-purple-600" />
                  Plan Actual
                </CardTitle>
                <CardDescription>
                  Tu plan activo y funcionalidades disponibles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <span className="font-semibold text-purple-800">
                      {user.plan_type || 'Sin plan asignado'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Funcionalidades Disponibles</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'training', label: 'Entrenamiento', icon: '💪' },
                      { key: 'nutrition', label: 'Nutrición', icon: '🥗' },
                      { key: 'meditation', label: 'Meditación', icon: '🧘' },
                      { key: 'active_breaks', label: 'Pausas Activas', icon: '☕' },
                    ].map((feature) => (
                      <div
                        key={feature.key}
                        className={`p-2 rounded-lg border text-sm ${
                          user.features?.[feature.key as keyof typeof user.features]
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        <span className="mr-2">{feature.icon}</span>
                        {feature.label}
                        {user.features?.[feature.key as keyof typeof user.features] ? (
                          <span className="ml-2 text-green-600">✓</span>
                        ) : (
                          <span className="ml-2 text-gray-400">✗</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {(!user.plan_type || user.plan_type === 'Sin plan asignado') && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700 mb-2">
                      ¿Quieres acceder a más funcionalidades?
                    </p>
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => window.location.href = '/plans'}
                    >
                      Ver Planes Disponibles
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats Summary */}
          {!statsLoading && userStats && (
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Actividad</CardTitle>
                <CardDescription>
                  Un vistazo rápido a tu progreso reciente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StatsSummary />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-6">
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Cargando estadísticas...</div>
            </div>
          ) : (
            <div className="grid gap-6">
              {/* Summary Stats */}
              <StatsSummary />
              
              <div className="grid gap-6 md:grid-cols-2">
                {/* Weekly Points Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Puntos Semanales</CardTitle>
                    <CardDescription>
                      Tu progreso en los últimos 7 días
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WeeklyPointsChart />
                  </CardContent>
                </Card>

                {/* Habit Completion Donut */}
                <Card>
                  <CardHeader>
                    <CardTitle>Distribución de Hábitos</CardTitle>
                    <CardDescription>
                      Porcentaje de completitud por categoría
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <HabitCompletionDonut />
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Habits Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Progreso Mensual</CardTitle>
                  <CardDescription>
                    Tendencia de tus hábitos en los últimos 30 días
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MonthlyHabitsChart />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                Configuración de Recordatorios
              </CardTitle>
              <CardDescription>
                Personaliza cuándo y cómo quieres recibir recordatorios para tus hábitos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationSettings />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step Sync Tab */}
        <TabsContent value="sync" className="space-y-6">
          <StepSyncSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
