import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Edit, Upload, Plus, Trash2 } from 'lucide-react';

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = React.useState([]);
  const [plans, setPlans] = React.useState([]);
  const [contentLibrary, setContentLibrary] = React.useState([]);
  const [workoutOfDay, setWorkoutOfDay] = React.useState<any>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterPlan, setFilterPlan] = React.useState('all');
  const [broadcastMessage, setBroadcastMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Edit dialogs state
  const [editingUser, setEditingUser] = React.useState<any>(null);
  const [editingPlan, setEditingPlan] = React.useState<any>(null);
  const [editingContent, setEditingContent] = React.useState<any>(null);
  const [editingWorkout, setEditingWorkout] = React.useState<any>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = React.useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = React.useState(false);
  const [isContentDialogOpen, setIsContentDialogOpen] = React.useState(false);
  const [isWorkoutDialogOpen, setIsWorkoutDialogOpen] = React.useState(false);

  React.useEffect(() => {
    fetchUsers();
    fetchPlans();
    fetchContentLibrary();
    fetchWorkoutOfDay();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users from admin dashboard');
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const usersData = await response.json();
        console.log('Users fetched:', usersData.length);
        setUsers(usersData);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/plans', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const plansData = await response.json();
        setPlans(plansData);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchContentLibrary = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/content-library', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const content = await response.json();
        setContentLibrary(content);
      }
    } catch (error) {
      console.error('Error fetching content library:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkoutOfDay = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/workout-of-day', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const workout = await response.json();
        setWorkoutOfDay(workout);
      }
    } catch (error) {
      console.error('Error fetching workout of day:', error);
    }
  };

  const filteredUsers = users.filter((user: any) => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = filterPlan === 'all' || (user.plan_type && user.plan_type.toLowerCase() === filterPlan.toLowerCase());
    return matchesSearch && matchesPlan;
  });

  const toggleUserActive = async (userId: number, currentStatus: boolean) => {
    try {
      console.log('Toggling user status:', userId, !currentStatus);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/users/${userId}/toggle-status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.ok) {
        setUsers(users.map((user: any) => 
          user.id === userId ? { ...user, is_active: !currentStatus ? 1 : 0 } : user
        ));
        console.log('User status updated successfully');
      } else {
        console.error('Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const updateUserFeatures = async (userId: number, features: any, planType?: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/users/${userId}/features`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ features, plan_type: planType }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(users.map((user: any) => 
          user.id === userId ? updatedUser : user
        ));
        console.log('User features updated successfully');
      }
    } catch (error) {
      console.error('Error updating user features:', error);
    }
  };

  const handleBroadcastSend = async () => {
    if (broadcastMessage.trim()) {
      try {
        console.log('Sending broadcast message');
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/broadcast', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: broadcastMessage 
          }),
        });

        if (response.ok) {
          setBroadcastMessage('');
          console.log('Broadcast message sent successfully');
          alert('Mensaje enviado exitosamente a todos los usuarios');
        } else {
          console.error('Failed to send broadcast message');
        }
      } catch (error) {
        console.error('Error sending broadcast message:', error);
      }
    }
  };

  const handleFileUpload = async (userId: number, fileType: 'training' | 'nutrition', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log(`Uploading ${fileType} file for user ${userId}:`, file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);
    formData.append('user_id', userId.toString());

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/upload-user-file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        console.log('File uploaded successfully');
        alert('Archivo subido exitosamente');
      } else {
        console.error('Failed to upload file');
        alert('Error al subir el archivo');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error al subir el archivo');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando panel administrativo...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Panel Administrativo</h1>
        <p className="text-muted-foreground">Gestiona usuarios, planes y contenido</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="plans">Planes</TabsTrigger>
          <TabsTrigger value="content">Contenido</TabsTrigger>
          <TabsTrigger value="workout">Entrenamiento</TabsTrigger>
          <TabsTrigger value="broadcast">Mensajes</TabsTrigger>
        </TabsList>

        {/* Users Management Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>Administra cuentas de usuario y sus características</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Label htmlFor="search">Buscar Usuarios</Label>
                  <Input
                    id="search"
                    placeholder="Buscar por nombre o correo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="filter">Filtrar por Plan</Label>
                  <Select value={filterPlan} onValueChange={setFilterPlan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los planes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los Planes</SelectItem>
                      <SelectItem value="healthy habits academy">Healthy Habits Academy</SelectItem>
                      <SelectItem value="programa totum">Programa Totum</SelectItem>
                      <SelectItem value="entrenamiento personalizado">Entrenamiento Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Características</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.full_name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${
                              user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role === 'admin' ? 'Admin' : 'Usuario'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.plan_type === 'Programa Totum' ? 'bg-purple-100 text-purple-800' :
                            user.plan_type === 'Entrenamiento Personalizado + Academy' ? 'bg-blue-100 text-blue-800' :
                            user.plan_type === 'Healthy Habits Academy' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.plan_type || 'Sin Plan'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.features?.training && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Entrenamiento</span>}
                            {user.features?.nutrition && <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Nutrición</span>}
                            {user.features?.meditation && <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">Meditación</span>}
                            {user.features?.active_breaks && <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">Pausas</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={Boolean(user.is_active)}
                              onCheckedChange={() => toggleUserActive(user.id, Boolean(user.is_active))}
                            />
                            <span className="text-sm">
                              {user.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => setEditingUser(user)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Editar Usuario</DialogTitle>
                                  <DialogDescription>
                                    Modifica las características del usuario
                                  </DialogDescription>
                                </DialogHeader>
                                {editingUser && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Plan</Label>
                                      <Select 
                                        value={editingUser.plan_type || ''} 
                                        onValueChange={(value) => setEditingUser({...editingUser, plan_type: value})}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Seleccionar plan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Healthy Habits Academy">Healthy Habits Academy</SelectItem>
                                          <SelectItem value="Entrenamiento Personalizado + Academy">Entrenamiento Personalizado</SelectItem>
                                          <SelectItem value="Programa Totum">Programa Totum</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    <div className="space-y-3">
                                      <Label>Características</Label>
                                      <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                          <Switch
                                            checked={editingUser.features?.habits || false}
                                            onCheckedChange={(checked) => 
                                              setEditingUser({
                                                ...editingUser,
                                                features: {...(editingUser.features || {}), habits: checked}
                                              })
                                            }
                                          />
                                          <Label>Seguimiento de Hábitos</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <Switch
                                            checked={editingUser.features?.training || false}
                                            onCheckedChange={(checked) => 
                                              setEditingUser({
                                                ...editingUser,
                                                features: {...(editingUser.features || {}), training: checked}
                                              })
                                            }
                                          />
                                          <Label>Entrenamiento</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <Switch
                                            checked={editingUser.features?.nutrition || false}
                                            onCheckedChange={(checked) => 
                                              setEditingUser({
                                                ...editingUser,
                                                features: {...(editingUser.features || {}), nutrition: checked}
                                              })
                                            }
                                          />
                                          <Label>Nutrición</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <Switch
                                            checked={editingUser.features?.meditation || false}
                                            onCheckedChange={(checked) => 
                                              setEditingUser({
                                                ...editingUser,
                                                features: {...(editingUser.features || {}), meditation: checked}
                                              })
                                            }
                                          />
                                          <Label>Meditación</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <Switch
                                            checked={editingUser.features?.active_breaks || false}
                                            onCheckedChange={(checked) => 
                                              setEditingUser({
                                                ...editingUser,
                                                features: {...(editingUser.features || {}), active_breaks: checked}
                                              })
                                            }
                                          />
                                          <Label>Pausas Activas</Label>
                                        </div>
                                      </div>
                                    </div>

                                    <Button 
                                      onClick={() => {
                                        updateUserFeatures(editingUser.id, editingUser.features, editingUser.plan_type);
                                        setEditingUser(null);
                                      }}
                                      className="w-full"
                                    >
                                      Guardar Cambios
                                    </Button>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            
                            <div className="flex space-x-1">
                              <div>
                                <input
                                  type="file"
                                  id={`training-${user.id}`}
                                  className="hidden"
                                  accept=".pdf"
                                  onChange={(e) => handleFileUpload(user.id, 'training', e)}
                                />
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => document.getElementById(`training-${user.id}`)?.click()}
                                  title="Subir Plan de Entrenamiento"
                                >
                                  <Upload className="h-4 w-4" />
                                  Ent
                                </Button>
                              </div>
                              <div>
                                <input
                                  type="file"
                                  id={`nutrition-${user.id}`}
                                  className="hidden"
                                  accept=".pdf"
                                  onChange={(e) => handleFileUpload(user.id, 'nutrition', e)}
                                />
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => document.getElementById(`nutrition-${user.id}`)?.click()}
                                  title="Subir Plan de Nutrición"
                                >
                                  <Upload className="h-4 w-4" />
                                  Nut
                                </Button>
                              </div>
                            </div>
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

        {/* Plans Management Tab */}
        <TabsContent value="plans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Planes</CardTitle>
              <CardDescription>Edita los planes disponibles y sus servicios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {plans.map((plan: any) => (
                  <Card key={plan.id} className="border-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{plan.name}</CardTitle>
                          <CardDescription>{plan.description}</CardDescription>
                          <div className="mt-2">
                            <span className="text-2xl font-bold">${plan.price}</span>
                            <span className="text-muted-foreground">/mes</span>
                          </div>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" onClick={() => setEditingPlan(plan)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Editar Plan</DialogTitle>
                              <DialogDescription>
                                Modifica los detalles del plan
                              </DialogDescription>
                            </DialogHeader>
                            {editingPlan && (
                              <div className="space-y-6">
                                <div className="space-y-2">
                                  <Label>Nombre del Plan</Label>
                                  <Input
                                    value={editingPlan.name}
                                    onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Descripción</Label>
                                  <Textarea
                                    value={editingPlan.description}
                                    onChange={(e) => setEditingPlan({...editingPlan, description: e.target.value})}
                                    rows={3}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Precio</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editingPlan.price}
                                    onChange={(e) => setEditingPlan({...editingPlan, price: parseFloat(e.target.value) || 0})}
                                  />
                                </div>
                                <Button 
                                  onClick={async () => {
                                    try {
                                      const token = localStorage.getItem('auth_token');
                                      await fetch(`/api/plans/${editingPlan.id}`, {
                                        method: 'PUT',
                                        headers: {
                                          'Authorization': `Bearer ${token}`,
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify(editingPlan),
                                      });
                                      fetchPlans();
                                      setEditingPlan(null);
                                    } catch (error) {
                                      console.error('Error updating plan:', error);
                                    }
                                  }}
                                  className="w-full"
                                >
                                  Guardar Cambios
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Library Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Biblioteca de Contenido</CardTitle>
                  <CardDescription>Gestiona ejercicios de pausas activas y contenido</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Contenido
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nuevo Contenido</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input placeholder="Nombre del ejercicio" />
                      </div>
                      <div className="space-y-2">
                        <Label>Descripción</Label>
                        <Textarea placeholder="Descripción breve" rows={3} />
                      </div>
                      <div className="space-y-2">
                        <Label>Categoría</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active_breaks">Pausas Activas</SelectItem>
                            <SelectItem value="exercise">Ejercicio</SelectItem>
                            <SelectItem value="meditation">Meditación</SelectItem>
                            <SelectItem value="nutrition">Nutrición</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>URL del Video (YouTube)</Label>
                        <Input placeholder="https://youtube.com/watch?v=..." />
                      </div>
                      <Button className="w-full">Crear Contenido</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contentLibrary.map((content: any) => (
                  <Card key={content.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-sm">{content.title}</CardTitle>
                          <CardDescription className="text-xs">{content.category}</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">{content.description}</p>
                      {content.video_url && (
                        <Button size="sm" variant="outline" onClick={() => window.open(content.video_url, '_blank')}>
                          Ver Video
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workout of Day Tab */}
        <TabsContent value="workout" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Entrenamiento del Día</CardTitle>
                  <CardDescription>Configura el entrenamiento diario para todos los usuarios</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingWorkout(workoutOfDay || { title: '', description: '', exercises: [] })}>
                      <Edit className="h-4 w-4 mr-2" />
                      {workoutOfDay ? 'Editar' : 'Crear'} Entrenamiento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Entrenamiento del Día</DialogTitle>
                    </DialogHeader>
                    {editingWorkout && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label>Título</Label>
                          <Input
                            value={editingWorkout.title}
                            onChange={(e) => setEditingWorkout({...editingWorkout, title: e.target.value})}
                            placeholder="Ej: Entrenamiento Full Body"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Descripción</Label>
                          <Textarea
                            value={editingWorkout.description}
                            onChange={(e) => setEditingWorkout({...editingWorkout, description: e.target.value})}
                            placeholder="Descripción del entrenamiento"
                            rows={3}
                          />
                        </div>
                        <Button className="w-full">Guardar Entrenamiento</Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {workoutOfDay ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{workoutOfDay.title}</h3>
                    <p className="text-muted-foreground mb-4">{workoutOfDay.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {JSON.parse(workoutOfDay.exercises_json || '[]').map((exercise: any, index: number) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-sm">{exercise.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">{exercise.description}</p>
                          {exercise.video_url && (
                            <Button size="sm" variant="outline" onClick={() => window.open(exercise.video_url, '_blank')}>
                              Ver Video
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No hay entrenamiento configurado para hoy.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Broadcast Messages Tab */}
        <TabsContent value="broadcast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mensaje Masivo</CardTitle>
              <CardDescription>Envía mensajes a todos los usuarios activos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message">Mensaje</Label>
                  <Textarea
                    id="message"
                    placeholder="Escribe tu mensaje para todos los usuarios..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    rows={5}
                  />
                </div>
                <Button 
                  onClick={handleBroadcastSend} 
                  className="w-full"
                  disabled={!broadcastMessage.trim()}
                >
                  Enviar Mensaje a Todos los Usuarios
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid md:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{users.length}</CardTitle>
                <CardDescription>Usuarios Totales</CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">
                  {users.filter((u: any) => u.is_active).length}
                </CardTitle>
                <CardDescription>Usuarios Activos</CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">
                  {users.filter((u: any) => u.plan_type === 'Programa Totum').length}
                </CardTitle>
                <CardDescription>Plan Totum</CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">
                  {users.filter((u: any) => u.role === 'admin').length}
                </CardTitle>
                <CardDescription>Administradores</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
