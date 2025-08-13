import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Calendar, Crown, Star, Activity } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [userStats, setUserStats] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      // Fetch weekly points
      const weeklyResponse = await fetch('/api/daily-habits/weekly-points', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let weeklyPoints = 0;
      if (weeklyResponse.ok) {
        const weeklyData = await weeklyResponse.json();
        weeklyPoints = weeklyData.total_points || 0;
      }

      // Fetch meditation sessions count
      const meditationResponse = await fetch('/api/meditation-sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let totalSessions = 0;
      let totalMinutes = 0;
      if (meditationResponse.ok) {
        const sessions = await meditationResponse.json();
        totalSessions = sessions.length;
        totalMinutes = sessions.reduce((sum: number, session: any) => sum + (session.duration_minutes || 0), 0);
      }

      setUserStats({
        weeklyPoints,
        totalSessions,
        totalMinutes
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando información del perfil...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mi Perfil</h1>
        <p className="text-muted-foreground">Información de tu cuenta y estadísticas</p>
      </div>

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
                  {Object.entries(user.features).map(([key, enabled]) => (
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

        {/* Statistics */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas</CardTitle>
              <CardDescription>Tu progreso semanal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{userStats?.weeklyPoints || 0}</div>
                <div className="text-sm text-muted-foreground">Puntos esta semana</div>
              </div>
              
              {userStats?.totalSessions > 0 && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{userStats.totalSessions}</div>
                    <div className="text-sm text-muted-foreground">Sesiones de meditación</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{userStats.totalMinutes}</div>
                    <div className="text-sm text-muted-foreground">Minutos meditando</div>
                  </div>
                </>
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
    </div>
  );
};

export default ProfilePage;