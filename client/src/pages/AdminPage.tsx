import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterPlan, setFilterPlan] = React.useState('all');
  const [broadcastMessage, setBroadcastMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    fetchUsers();
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
    } finally {
      setIsLoading(false);
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
            sender_id: user?.id,
            message: broadcastMessage 
          }),
        });

        if (response.ok) {
          setBroadcastMessage('');
          console.log('Broadcast message sent successfully');
        } else {
          console.error('Failed to send broadcast message');
        }
      } catch (error) {
        console.error('Error sending broadcast message:', error);
      }
    }
  };

  const handleFileUpload = (userId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log(`Uploading file for user ${userId}:`, file.name);
      // TODO: Implement file upload
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

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* User Management */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gestión de Usuarios</CardTitle>
            <CardDescription>Administra cuentas de usuario y planes</CardDescription>
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
                    <SelectItem value="standard">Estándar</SelectItem>
                    <SelectItem value="advanced">Avanzado</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.plan_type === 'premium' ? 'bg-purple-100 text-purple-800' :
                          user.plan_type === 'advanced' ? 'bg-blue-100 text-blue-800' :
                          user.plan_type === 'standard' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.plan_type || 'Sin Plan'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'Usuario'}
                        </span>
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
                          <Button size="sm" variant="outline">
                            Editar
                          </Button>
                          <div>
                            <input
                              type="file"
                              id={`file-${user.id}`}
                              className="hidden"
                              accept=".pdf"
                              onChange={(e) => handleFileUpload(user.id, e)}
                            />
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => document.getElementById(`file-${user.id}`)?.click()}
                            >
                              Subir PDF
                            </Button>
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

        {/* Broadcast Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Mensaje Masivo</CardTitle>
            <CardDescription>Envía mensajes a todos los usuarios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">Mensaje</Label>
                <Input
                  id="message"
                  placeholder="Escribe tu mensaje..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleBroadcastSend} 
                className="w-full"
                disabled={!broadcastMessage.trim()}
              >
                Enviar Mensaje
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
              {users.filter((u: any) => u.plan_type === 'premium').length}
            </CardTitle>
            <CardDescription>Planes Premium</CardDescription>
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
    </div>
  );
};

export default AdminPage;
