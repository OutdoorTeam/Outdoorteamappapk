import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  useAdminAchievements, 
  useCreateAchievement, 
  useUpdateAchievement, 
  useDeleteAchievement 
} from '@/hooks/api/use-achievements';
import { Trophy, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

interface Achievement {
  id: number;
  name: string;
  description: string;
  type: 'fixed' | 'progressive';
  category: 'exercise' | 'nutrition' | 'daily_steps' | 'meditation';
  goal_value: number;
  icon_url?: string;
  is_active: number;
  created_at: string;
}

const AchievementManagement: React.FC = () => {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingAchievement, setEditingAchievement] = React.useState<Achievement | null>(null);

  const { data: achievements, isLoading } = useAdminAchievements();
  const createMutation = useCreateAchievement();
  const updateMutation = useUpdateAchievement();
  const deleteMutation = useDeleteAchievement();

  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    type: 'fixed' as 'fixed' | 'progressive',
    category: 'exercise' as 'exercise' | 'nutrition' | 'daily_steps' | 'meditation',
    goal_value: '',
    icon_url: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.goal_value) {
      toast({
        title: "Error",
        description: "Todos los campos requeridos deben estar completos",
        variant: "destructive",
      });
      return;
    }

    try {
      const data = {
        ...formData,
        goal_value: parseInt(formData.goal_value)
      };

      if (editingAchievement) {
        await updateMutation.mutateAsync({ id: editingAchievement.id, data });
        toast({
          title: "Logro actualizado",
          description: "El logro se ha actualizado exitosamente",
          variant: "success",
        });
      } else {
        await createMutation.mutateAsync(data);
        toast({
          title: "Logro creado",
          description: "El nuevo logro se ha creado exitosamente",
          variant: "success",
        });
      }

      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar el logro",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (achievement: Achievement) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${achievement.name}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(achievement.id);
      toast({
        title: "Logro eliminado",
        description: "El logro se ha eliminado exitosamente",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar el logro",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (achievement: Achievement) => {
    try {
      await updateMutation.mutateAsync({ 
        id: achievement.id, 
        data: { is_active: !achievement.is_active }
      });
      toast({
        title: achievement.is_active ? "Logro desactivado" : "Logro activado",
        description: `El logro "${achievement.name}" se ha ${achievement.is_active ? 'desactivado' : 'activado'}`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cambiar el estado del logro",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'fixed',
      category: 'exercise',
      goal_value: '',
      icon_url: ''
    });
    setIsCreateOpen(false);
    setEditingAchievement(null);
  };

  const handleEdit = (achievement: Achievement) => {
    setFormData({
      name: achievement.name,
      description: achievement.description,
      type: achievement.type,
      category: achievement.category,
      goal_value: achievement.goal_value.toString(),
      icon_url: achievement.icon_url || ''
    });
    setEditingAchievement(achievement);
    setIsCreateOpen(true);
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'exercise': return 'Entrenamiento';
      case 'nutrition': return 'Nutrición';
      case 'daily_steps': return 'Pasos Diarios';
      case 'meditation': return 'Meditación';
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'exercise': return 'bg-blue-100 text-blue-800';
      case 'nutrition': return 'bg-green-100 text-green-800';
      case 'daily_steps': return 'bg-yellow-100 text-yellow-800';
      case 'meditation': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Cargando logros...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                Gestión de Logros
              </CardTitle>
              <CardDescription>
                Crear y gestionar logros para motivar a los usuarios
              </CardDescription>
            </div>
            
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Nuevo Logro
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingAchievement ? 'Editar Logro' : 'Crear Nuevo Logro'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingAchievement ? 'Modifica los datos del logro' : 'Completa la información para crear un nuevo logro'}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Nombre del logro"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="icon">Icono/Emoji</Label>
                      <Input
                        id="icon"
                        value={formData.icon_url}
                        onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                        placeholder="🏆"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe qué debe hacer el usuario para obtener este logro"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value as 'fixed' | 'progressive' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fijo</SelectItem>
                          <SelectItem value="progressive">Progresivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Categoría *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exercise">Entrenamiento</SelectItem>
                          <SelectItem value="nutrition">Nutrición</SelectItem>
                          <SelectItem value="daily_steps">Pasos Diarios</SelectItem>
                          <SelectItem value="meditation">Meditación</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="goal">Valor Meta *</Label>
                      <Input
                        id="goal"
                        type="number"
                        value={formData.goal_value}
                        onChange={(e) => setFormData({ ...formData, goal_value: e.target.value })}
                        placeholder="0"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 
                       editingAchievement ? 'Actualizar' : 'Crear'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Logro</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Meta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {achievements?.map((achievement) => (
                <TableRow key={achievement.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{achievement.icon_url || '🏆'}</span>
                      <div>
                        <div className="font-medium">{achievement.name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {achievement.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline">
                      {achievement.type === 'fixed' ? 'Fijo' : 'Progresivo'}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={getCategoryColor(achievement.category)}>
                      {getCategoryName(achievement.category)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="font-mono">
                    {achievement.goal_value.toLocaleString()}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={achievement.is_active === 1}
                        onCheckedChange={() => handleToggleActive(achievement)}
                        disabled={updateMutation.isPending}
                      />
                      {achievement.is_active === 1 ? (
                        <Eye className="w-4 h-4 text-green-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(achievement)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(achievement)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {!achievements?.length && (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground">No hay logros creados aún</p>
              <p className="text-sm text-muted-foreground mt-2">
                Crea el primer logro para motivar a los usuarios
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AchievementManagement;
