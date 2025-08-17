import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Dumbbell, Apple, Settings, FileText, BarChart3 } from 'lucide-react';
import { BroadcastNotifications } from '@/components/admin/BroadcastNotifications';
import { useUsers } from '@/hooks/api/use-users';
import PlansManagementPage from './admin/PlansManagementPage';

// Import other admin components (assuming they exist)
// import { UserManagement } from '@/components/admin/UserManagement';
// import { ContentLibraryManagement } from '@/components/admin/ContentLibraryManagement';
// import { FileManagement } from '@/components/admin/FileManagement';

const AdminPage: React.FC = () => {
  const { data: users, isLoading: usersLoading } = useUsers();

  const stats = React.useMemo(() => {
    if (!users) return { total: 0, active: 0, withPlans: 0 };
    
    return {
      total: users.length,
      active: users.filter(u => u.is_active).length,
      withPlans: users.filter(u => u.plan_type).length,
    };
  }, [users]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Panel de Administración</h1>
        <p className="text-muted-foreground">
          Gestiona usuarios, contenido y configuración de la plataforma
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-10 w-10 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Usuarios</p>
                <p className="text-2xl font-bold">
                  {usersLoading ? '...' : stats.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-10 w-10 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Usuarios Activos</p>
                <p className="text-2xl font-bold">
                  {usersLoading ? '...' : stats.active}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <BarChart3 className="h-10 w-10 text-[#D3B869]" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Con Plan</p>
                <p className="text-2xl font-bold">
                  {usersLoading ? '...' : stats.withPlans}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Admin Tabs */}
      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            <span className="hidden sm:inline">Planes</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Usuarios</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Contenido</span>
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Archivos</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Notif.</span>
          </TabsTrigger>
        </TabsList>

        {/* Plans Management */}
        <TabsContent value="plans">
          <PlansManagementPage />
        </TabsContent>

        {/* Users Management */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Gestión de Usuarios
              </CardTitle>
              <CardDescription>
                Administra usuarios, roles y estados de cuenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Componente de gestión de usuarios en desarrollo
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Management */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Biblioteca de Contenido
              </CardTitle>
              <CardDescription>
                Gestiona videos, ejercicios y material educativo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Gestión de biblioteca de contenido en desarrollo
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Management */}
        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Gestión de Archivos
              </CardTitle>
              <CardDescription>
                Administra PDFs y archivos de usuario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Gestión de archivos en desarrollo
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Notificaciones y Configuración
              </CardTitle>
              <CardDescription>
                Envía mensajes broadcast y configura notificaciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BroadcastNotifications />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
