
import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useToggleUserStatus } from '@/hooks/api/use-users';
import { useToast } from '@/hooks/use-toast';
import { usePlans } from '@/hooks/api/use-plans';
import BroadcastNotifications from '@/components/admin/BroadcastNotifications';
import UserDetailPanel from '@/components/admin/UserDetailPanel';
import ContentManagement from '@/components/admin/ContentManagement';
import PlansManagementPage from '@/pages/admin/PlansManagementPage';
import DiagnosticsPage from '@/pages/admin/DiagnosticsPage';
import PlansConfiguration from '@/components/admin/PlansConfiguration';
import { 
  Users, 
  Shield, 
  Settings, 
  Crown,
  UserCheck,
  UserX,
  Bell,
  Dumbbell,
  Mail,
  Play,
  Eye,
  Activity
} from 'lucide-react';

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = React.useState<any>(null);
  
  const { data: users, isLoading: usersLoading, error: usersError } = useUsers();
  const { data: plans, error: plansError } = usePlans();
  const toggleUserStatusMutation = useToggleUserStatus();

  const handleToggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await toggleUserStatusMutation.mutateAsync({
        userId,
        is_active: !currentStatus
      });
      
      toast({
        title: !currentStatus ? "Usuario activado" : "Usuario desactivado",
        description: `El usuario ha sido ${!currentStatus ? 'activado' : 'desactivado'} exitosamente`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del usuario",
        variant: "destructive",
      });
    }
  };

  const handleUserClick = (clickedUser: any) => {
    setSelectedUser(clickedUser);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-600 mb-4">Acceso Denegado</h2>
          <p className="text-muted-foreground">
            No tienes permisos para acceder a esta página.
          </p>
        </div>
      </div>
    );
  }

  // Show user detail panel if a user is selected
  if (selectedUser) {
    return (
      <UserDetailPanel 
        user={selectedUser} 
        onClose={() => setSelectedUser(null)} 
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Panel de Administración</h1>
        <p className="text-muted-foreground">
          Gestiona usuarios, contenido y configuraciones del sistema
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Contenido
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Planes de Usuario
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Gestión de Usuarios
              </CardTitle>
              <CardDescription>
                Administra los usuarios registrados en la plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
                </div>
              ) : usersError ? (
                <div className="text-center py-8">
                  <div className="text-red-600 mb-4">
                    <Shield className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-lg font-medium">Error al cargar usuarios</p>
                    <p className="text-sm">Revisa la pestaña "Diagnósticos" para más detalles</p>
                  </div>
                </div>
              ) : users && users.length > 0 ? (
                <div className="space-y-4">
                  {users.map((userItem) => (
                    <Card key={userItem.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            userItem.role === 'admin' ? 'bg-yellow-100' : 'bg-blue-100'
                          }`}>
                            {userItem.role === 'admin' ? (
                              <Crown className="w-5 h-5 text-yellow-600" />
                            ) : (
                              <Users className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{userItem.full_name}</h3>
                              <Badge variant={userItem.role === 'admin' ? 'default' : 'secondary'}>
                                {userItem.role === 'admin' ? 'Administrador' : 'Usuario'}
                              </Badge>
                              <Badge variant={userItem.is_active ? 'default' : 'destructive'}>
                                {userItem.is_active ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground">{userItem.email}</p>
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Plan: {userItem.plan_type || 'Sin plan'}</span>
                              <span>Registrado: {new Date(userItem.created_at).toLocaleDateString()}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-2">
                              {userItem.features.habits && <Badge variant="outline" className="text-xs">Hábitos</Badge>}
                              {userItem.features.training && <Badge variant="outline" className="text-xs">Entrenamiento</Badge>}
                              {userItem.features.nutrition && <Badge variant="outline" className="text-xs">Nutrición</Badge>}
                              {userItem.features.meditation && <Badge variant="outline" className="text-xs">Meditación</Badge>}
                              {userItem.features.active_breaks && <Badge variant="outline" className="text-xs">Pausas Activas</Badge>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUserClick(userItem)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalles
                          </Button>
                          
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={userItem.is_active}
                              onCheckedChange={() => handleToggleUserStatus(userItem.id, userItem.is_active)}
                              disabled={toggleUserStatusMutation.isPending || userItem.role === 'admin'}
                            />
                            <span className="text-sm text-muted-foreground">
                              {userItem.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                          
                          {userItem.is_active ? (
                            <UserCheck className="w-5 h-5 text-green-600" />
                          ) : (
                            <UserX className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No hay usuarios</h3>
                  <p className="text-muted-foreground">
                    Los usuarios registrados aparecerán aquí
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <ContentManagement />
        </TabsContent>

        <TabsContent value="plans">
          <PlansManagementPage />
        </TabsContent>

        <TabsContent value="notifications">
          <BroadcastNotifications />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <PlansConfiguration />
          <DiagnosticsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
