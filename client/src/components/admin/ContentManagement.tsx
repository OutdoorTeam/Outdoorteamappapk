import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  useContentLibrary, 
  useCreateContentLibraryItem, 
  useUpdateContentLibraryItem, 
  useDeleteContentLibraryItem 
} from '@/hooks/api/use-content-library';
import { Plus, Play, Edit, Trash2, ExternalLink, Save, X } from 'lucide-react';

const ContentManagement: React.FC = () => {
  const { toast } = useToast();
  const [showForm, setShowForm] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any>(null);

  // Form state
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [videoUrl, setVideoUrl] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [subcategory, setSubcategory] = React.useState('');

  // API hooks
  const { data: contentLibrary, isLoading } = useContentLibrary();
  const createItemMutation = useCreateContentLibraryItem();
  const updateItemMutation = useUpdateContentLibraryItem();
  const deleteItemMutation = useDeleteContentLibraryItem();

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setVideoUrl('');
    setCategory('');
    setSubcategory('');
    setEditingItem(null);
  };

  const handleShowForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (item: any) => {
    setTitle(item.title);
    setDescription(item.description || '');
    setVideoUrl(item.video_url || '');
    setCategory(item.category);
    setSubcategory(item.subcategory || '');
    setEditingItem(item);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !category) {
      toast({
        title: "Error",
        description: "Título y categoría son requeridos",
        variant: "destructive",
      });
      return;
    }

    // Basic YouTube URL validation
    if (videoUrl && !videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be')) {
      toast({
        title: "Error",
        description: "Por favor ingresa una URL válida de YouTube",
        variant: "destructive",
      });
      return;
    }

    try {
      const itemData = {
        title: title.trim(),
        description: description.trim() || null,
        video_url: videoUrl.trim() || null,
        category,
        subcategory: subcategory.trim() || null,
        is_active: true
      };

      if (editingItem) {
        await updateItemMutation.mutateAsync({ id: editingItem.id, ...itemData });
        toast({
          title: "Video actualizado",
          description: "El video se ha actualizado exitosamente",
          variant: "default",
        });
      } else {
        await createItemMutation.mutateAsync(itemData);
        toast({
          title: "Video agregado",
          description: "El video se ha agregado a la biblioteca",
          variant: "default",
        });
      }

      resetForm();
      setShowForm(false);
    } catch (error) {
      toast({
        title: "Error",
        description: editingItem ? "No se pudo actualizar el video" : "No se pudo agregar el video",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${item.title}"?`)) {
      return;
    }

    try {
      await deleteItemMutation.mutateAsync(item.id);
      toast({
        title: "Video eliminado",
        description: "El video se ha eliminado de la biblioteca",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el video",
        variant: "destructive",
      });
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'exercise':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active_breaks':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'meditation':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryName = (cat: string) => {
    switch (cat) {
      case 'exercise':
        return 'Ejercicio';
      case 'active_breaks':
        return 'Pausa Activa';
      case 'meditation':
        return 'Meditación';
      default:
        return cat;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Biblioteca de Videos</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona los videos que se pueden usar en planes de entrenamiento
          </p>
        </div>
        <Button onClick={handleShowForm}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Video
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {editingItem ? 'Editar Video' : 'Agregar Nuevo Video'}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => {
                setShowForm(false);
                resetForm();
              }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Push ups básicos"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Categoría *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exercise">Ejercicio</SelectItem>
                      <SelectItem value="active_breaks">Pausa Activa</SelectItem>
                      <SelectItem value="meditation">Meditación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subcategory">Subcategoría</Label>
                  <Input
                    id="subcategory"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="Ej: Pecho, Espalda, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="videoUrl">URL de YouTube</Label>
                  <Input
                    id="videoUrl"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción del ejercicio, instrucciones, etc."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={createItemMutation.isPending || updateItemMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createItemMutation.isPending || updateItemMutation.isPending 
                    ? 'Guardando...' 
                    : editingItem 
                      ? 'Actualizar Video' 
                      : 'Agregar Video'
                  }
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Content Library */}
      <Card>
        <CardHeader>
          <CardTitle>Videos en la Biblioteca ({contentLibrary?.length || 0})</CardTitle>
          <CardDescription>
            Videos disponibles para usar en planes de entrenamiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Cargando biblioteca...</p>
            </div>
          ) : contentLibrary && contentLibrary.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contentLibrary.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getCategoryColor(item.category)}`}
                            >
                              {getCategoryName(item.category)}
                            </Badge>
                            {item.subcategory && (
                              <Badge variant="outline" className="text-xs">
                                {item.subcategory}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {item.video_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(item.video_url, '_blank')}
                            className="flex-1"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Ver Video
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(item)}
                          disabled={deleteItemMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Created date */}
                      <div className="text-xs text-muted-foreground">
                        Creado: {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                No hay videos en la biblioteca
              </h3>
              <p className="text-muted-foreground mb-4">
                Comienza agregando videos para usar en los planes de entrenamiento
              </p>
              <Button onClick={handleShowForm}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primer Video
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentManagement;
