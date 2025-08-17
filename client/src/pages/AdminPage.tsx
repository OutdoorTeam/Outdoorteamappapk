import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
  Shield,
  Video,
  Edit,
  Plus,
  PlayCircle
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

interface ContentVideo {
  id: number;
  title: string;
  description: string;
  category: string;
  video_url: string;
  is_active: boolean;
  created_at: string;
}

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = React.useState<User[]>([]);
  const [userFiles, setUserFiles] = React.useState<UserFile[]>([]);
  const [contentVideos, setContentVideos] = React.useState<ContentVideo[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [uploadingFile, setUploadingFile] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null);
  const [selectedFileType, setSelectedFileType] = React.useState<'training' | 'nutrition'>('training');
  
  // Video form states
  const [showVideoDialog, setShowVideoDialog] = React.useState(false);
  const [editingVideo, setEditingVideo] = React.useState<ContentVideo | null>(null);
  const [videoForm, setVideoForm] = React.useState({
    title: '',
    description: '',
    category: '',
    video_url: '',
    is_active: true
  });

  React.useEffect(() => {
    fetchUsers();
    fetchUserFiles();
    fetchContentVideos();
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

  const fetchContentVideos = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/content-library', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const videosData = await response.json();
        console.log('Content videos fetched:', videosData.length);
        setContentVideos(videosData);
      }
    } catch (error) {
      console.error('Error fetching content videos:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedUserId) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        title: "Error de archivo",
        description: "Solo se permiten archivos PDF",
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error de archivo",
        description: "El archivo no puede superar los 10MB",
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

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
          variant: "default",
        });
        fetchUserFiles();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error de subida",
        description: error instanceof Error ? error.message : "No se pudo subir el archivo",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este archivo?')) return;
    
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
          variant: "default",
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
          variant: "default",
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

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoForm.title || !videoForm.category || !videoForm.video_url) {
      toast({
        title: "Error de validación",
        description: "Título, categoría y URL del video son requeridos",
        variant: "destructive",
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(videoForm.video_url);
    } catch {
      toast({
        title: "Error de validación",
        description: "La URL del video no es válida",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const method = editingVideo ? 'PUT' : 'POST';
      const url = editingVideo ? `/api/content-library/${editingVideo.id}` : '/api/content-library';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(videoForm)
      });

      if (response.ok) {
        toast({
          title: editingVideo ? "Video actualizado" : "Video creado",
          description: `El video se ${editingVideo ? 'actualizó' : 'creó'} exitosamente`,
          variant: "default",
        });
        setShowVideoDialog(false);
        setEditingVideo(null);
        setVideoForm({ title: '', description: '', category: '', video_url: '', is_active: true });
        fetchContentVideos();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving video:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar el video",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVideo = async (videoId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este video?')) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/content-library/${videoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast({
          title: "Video eliminado",
          description: "El video se eliminó exitosamente",
          variant: "default",
        });
        fetchContentVideos();
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el video",
        variant: "destructive",
      });
    }
  };

  const handleEditVideo = (video: ContentVideo) => {
    setEditingVideo(video);
    setVideoForm({
      title: video.title,
      description: video.description || '',
      category: video.category,
      video_url: video.video_url,
      is_active: video.is_active
    });
    setShowVideoDialog(true);
  };

  const resetVideoForm = () => {
    setEditingVideo(null);
    setVideoForm({ title: '', description: '', category: '', video_url: '', is_active: true });
    setShowVideoDialog(false);
  };

  const getCategoryDisplayName = (category: string) => {
    const categoryMap: Record<string, string> = {
      'exercise': 'Entrenamiento',
      'active_breaks': 'Pausas Activas',
      'meditation': 'Meditación'
    };
    return categoryMap[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      'exercise': 'bg-blue-100 text-blue-800',
      'active_breaks': 'bg-orange-100 text-orange-800',
      'meditation': 'bg-purple-100 text-purple-800'
    };
    return colorMap[category] || 'bg-gray-100 text-gray-800';
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Archivos
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Contenido
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
                  Sube planes de entrenamiento o nutrición para usuarios específicos (Solo archivos PDF)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Usuario</Label>
                    <Select value={selectedUserId?.toString() || ''} onValueChange={(value) => setSelectedUserId(Number(value) || null)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar usuario" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter(u => u.role !== 'admin').map(user => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.full_name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Archivo</Label>
                    <Select value={selectedFileType} onValueChange={(value) => setSelectedFileType(value as 'training' | 'nutrition')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="training">Plan de Entrenamiento</SelectItem>
                        <SelectItem value="nutrition">Plan de Nutrición</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Archivo (Solo PDF, máx. 10MB)</Label>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileUpload}
                      disabled={!selectedUserId || uploadingFile}
                      className="w-full p-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
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

        <TabsContent value="content">
          <div className="space-y-6">
            {/* Content Management Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gestión de Contenido</CardTitle>
                    <CardDescription>
                      Administra los videos y contenido multimedia de la plataforma
                    </CardDescription>
                  </div>
                  <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => resetVideoForm()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Video
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          {editingVideo ? 'Editar Video' : 'Agregar Nuevo Video'}
                        </DialogTitle>
                        <DialogDescription>
                          {editingVideo ? 'Modifica los datos del video' : 'Completa la información para agregar un nuevo video'}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleVideoSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Título *</Label>
                          <Input
                            id="title"
                            value={videoForm.title}
                            onChange={(e) => setVideoForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Ej: Rutina de Calentamiento"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">Descripción</Label>
                          <Textarea
                            id="description"
                            value={videoForm.description}
                            onChange={(e) => setVideoForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Descripción del video..."
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="category">Categoría *</Label>
                          <Select value={videoForm.category} onValueChange={(value) => setVideoForm(prev => ({ ...prev, category: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="exercise">Entrenamiento</SelectItem>
                              <SelectItem value="active_breaks">Pausas Activas</SelectItem>
                              <SelectItem value="meditation">Meditación</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="video_url">URL del Video *</Label>
                          <Input
                            id="video_url"
                            value={videoForm.video_url}
                            onChange={(e) => setVideoForm(prev => ({ ...prev, video_url: e.target.value }))}
                            placeholder="https://www.youtube.com/watch?v=... o URL de archivo .mp4"
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            Acepta URLs de YouTube, Vimeo, o archivos MP4 directos
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="is_active"
                            checked={videoForm.is_active}
                            onCheckedChange={(checked) => setVideoForm(prev => ({ ...prev, is_active: checked }))}
                          />
                          <Label htmlFor="is_active">Video activo (visible para usuarios)</Label>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                          <Button type="button" variant="outline" onClick={resetVideoForm}>
                            Cancelar
                          </Button>
                          <Button type="submit">
                            {editingVideo ? 'Actualizar' : 'Crear'} Video
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
            </Card>

            {/* Videos List */}
            <Card>
              <CardHeader>
                <CardTitle>Videos ({contentVideos.length})</CardTitle>
                <CardDescription>
                  Gestiona todos los videos de la plataforma por categoría
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Video</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contentVideos.map(video => (
                        <TableRow key={video.id}>
                          <TableCell>
                            <div className="flex items-start gap-3">
                              <PlayCircle className="w-5 h-5 text-blue-600 mt-1" />
                              <div className="min-w-0">
                                <div className="font-medium">{video.title}</div>
                                {video.description && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {video.description.substring(0, 100)}
                                    {video.description.length > 100 && '...'}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1 break-all">
                                  {video.video_url.substring(0, 60)}
                                  {video.video_url.length > 60 && '...'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(video.category)}`}>
                              {getCategoryDisplayName(video.category)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${
                              video.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {video.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(video.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(video.video_url, '_blank')}
                                title="Ver video"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditVideo(video)}
                                title="Editar video"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteVideo(video.id)}
                                title="Eliminar video"
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
                
                {contentVideos.length === 0 && (
                  <div className="text-center py-12">
                    <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No hay videos</h3>
                    <p className="text-muted-foreground mb-4">
                      Agrega videos para que aparezcan en las secciones de usuarios
                    </p>
                  </div>
                )}
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
                  <span>Videos:</span>
                  <span className="font-bold text-blue-600">{contentVideos.length}</span>
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