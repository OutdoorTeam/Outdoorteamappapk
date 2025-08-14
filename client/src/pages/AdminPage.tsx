import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import BroadcastNotifications from '@/components/admin/BroadcastNotifications';
import { 
  Users, 
  MessageSquare, 
  FileText, 
  Settings, 
  BarChart3, 
  Bell,
  Calendar,
  Activity,
  Target,
  Coffee,
  Brain,
  Upload,
  Download,
  Trash2,
  Eye,
  Send,
  Shield
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  plan_type: string;
  is_active: boolean;
  features: Record<string, boolean>;
  created_at: string;
}

interface UserFile {
  id: number;
  user_id: number;
  filename: string;
  file_type: string;
  file_path: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = React.useState<User[]>([]);
  const [userFiles, setUserFiles] = React.useState<UserFile[]>([]);
  const [broadcastMessage, setBroadcastMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [uploadingFile, setUploadingFile] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null);
  const [selectedFileType, setSelectedFileType] = React.useState<'training' | 'nutrition'>('training');

  React.useEffect(() => {
    fetchUsers();
    fetchUserFiles();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const usersData = await response.json();
        console.log('Users fetched:', usersData.length);
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserFiles = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/user-files', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const filesData = await response.json();
        console.log('User files fetched:', filesData.length);
        setUserFiles(filesData);
      }
    } catch (error) {
      console.error('Error fetching user files:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedUserId) return;

    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', selectedUserId.toString());
      formData.append('file_type', selectedFileType);

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/upload-user-file', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        toast({
          title: "Archivo subido",
          description: "El archivo se subió exitosamente",
          variant: "success",
        });
        fetchUserFiles();
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error de subida",
        description: "No se pudo subir el archivo",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/user-files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast({
          title: "Archivo eliminado",
          description: "El archivo se eliminó exitosamente",
          variant: "success",
        });
        fetchUserFiles();
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el archivo",
        variant: "destructive",
      });
    }
  };

  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/users/${userId}/toggle-status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        toast({
          title: "Estado actualizado",
          description: `Usuario ${!currentStatus ? 'activado' : 'desactivado'} exitosamente`,
          variant: "success",
        });
        fetchUsers();
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del usuario",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando panel de administración...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Panel de Administración</h1>
        <p className="text-muted-foreground">Gestiona usuarios, contenido y configuraciones del sistema</p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Archivos
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>
                {users.length} usuarios registrados en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.role === 'admin' ? (
                              <Shield className="w-4 h-4 text-red-600" />
                            ) : (
                              <Users className="w-4 h-4 text-blue-600" />
                            )}
                            <div>
                              <div className="font-medium">{user.full_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{user.email}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.plan_type 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {user.plan_type || 'Sin plan'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {user.role !== 'admin' && (
                              <Button
                                size="sm"
                                variant={user.is_active ? "destructive" : "default"}
                                onClick={() => toggleUserStatus(user.id, user.is_active)}
                              >
                                {user.is_active ? 'Desactivar' : 'Activar'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <div className="space-y-6">
            {/* Upload Files Section */}
            <Card>
              <CardHeader>
                <CardTitle>Subir Archivo de Usuario</CardTitle>
                <CardDescription>
                  Sube planes de entrenamiento o nutrición para usuarios específicos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Usuario</Label>
                    <select
                      value={selectedUserId || ''}
                      onChange={(e) => setSelectedUserId(Number(e.target.value) || null)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Seleccionar usuario</option>
                      {users.filter(u => u.role !== 'admin').map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Archivo</Label>
                    <select
                      value={selectedFileType}
                      onChange={(e) => setSelectedFileType(e.target.value as 'training' | 'nutrition')}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="training">Plan de Entrenamiento</option>
                      <option value="nutrition">Plan de Nutrición</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Archivo</Label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      disabled={!selectedUserId || uploadingFile}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                {uploadingFile && (
                  <div className="text-center py-4">
                    <div className="text-sm text-muted-foreground">Subiendo archivo...</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Files List */}
            <Card>
              <CardHeader>
                <CardTitle>Archivos de Usuarios</CardTitle>
                <CardDescription>
                  {userFiles.length} archivos en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Archivo</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userFiles.map(file => (
                        <TableRow key={file.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <span className="font-medium">{file.filename}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{file.user_name}</div>
                              <div className="text-sm text-muted-foreground">{file.user_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${
                              file.file_type === 'training' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {file.file_type === 'training' ? 'Entrenamiento' : 'Nutrición'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(file.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(`/api/files/${file.id}`, '_blank')}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteFile(file.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <BroadcastNotifications />
        </TabsContent>

        <TabsContent value="system">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* System Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Estadísticas del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total de usuarios:</span>
                  <span className="font-bold">{users.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Usuarios activos:</span>
                  <span className="font-bold text-green-600">
                    {users.filter(u => u.is_active).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Administradores:</span>
                  <span className="font-bold text-red-600">
                    {users.filter(u => u.role === 'admin').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Archivos subidos:</span>
                  <span className="font-bold">{userFiles.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open('/api/admin/reset-history', '_blank')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Ver Historial de Reset
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/admin/plans'}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Gestionar Planes
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/exercises'}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Ver Biblioteca de Ejercicios
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/active-breaks'}
                >
                  <Coffee className="w-4 h-4 mr-2" />
                  Ver Pausas Activas
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/meditation'}
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Probar Meditación
                </Button>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle>Estado del Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Base de datos</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✓ Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✓ Funcionando</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Notificaciones</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✓ Activas</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Reset Diario</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✓ Programado</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
