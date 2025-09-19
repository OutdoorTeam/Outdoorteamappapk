import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useContentLibrary, useCreateContent, useUpdateContent, useDeleteContent } from '@/hooks/api/use-content-library';
import { Plus, Edit, Trash2, Play, Eye } from 'lucide-react';

interface ContentItem {
  id: number;
  title: string;
  description: string | null;
  video_url: string | null;
  category: string;
  subcategory: string | null;
  is_active: boolean;
  created_at: string;
}

interface ContentFormData {
  title: string;
  description: string;
  video_url: string;
  category: string;
  subcategory: string;
  is_active: boolean;
}

const ContentManagement: React.FC = () => {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingContent, setEditingContent] = React.useState<ContentItem | null>(null);
  const [formData, setFormData] = React.useState<ContentFormData>({
    title: '',
    description: '',
    video_url: '',
    category: 'exercise',
    subcategory: '',
    is_active: true
  });

  const { data: contentLibrary, isLoading } = useContentLibrary();
  const createContentMutation = useCreateContent();
  const updateContentMutation = useUpdateContent();
  const deleteContentMutation = useDeleteContent();

  const categories = [
    { value: 'exercise', label: 'Ejercicios' },
    { value: 'active_breaks', label: 'Pausas Activas' },
    { value: 'meditation', label: 'Meditación' }
  ];

  // Get video thumbnail from YouTube URL
  const getYouTubeThumbnail = (url: string | null) => {
    if (!url) return null;
    
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    
    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
    
    return null;
  };

  const filteredContent = contentLibrary?.filter(item => 
    selectedCategory === 'all' || item.category === selectedCategory
  ) || [];

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      video_url: '',
      category: 'exercise',
      subcategory: '',
      is_active: true
    });
    setEditingContent(null);
    setIsFormOpen(false);
  };

  const handleEdit = (content: ContentItem) => {
    setEditingContent(content);
    setFormData({
      title: content.title,
      description: content.description || '',
      video_url: content.video_url || '',
      category: content.category,
      subcategory: content.subcategory || '',
      is_active: content.is_active
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "El título es requerido",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingContent) {
        await updateContentMutation.mutateAsync({
          id: editingContent.id,
          ...formData
        });
        toast({
          title: "Contenido actualizado",
          description: "El contenido se ha actualizado correctamente",
        });
      } else {
        await createContentMutation.mutateAsync(formData);
        toast({
          title: "Contenido creado",
          description: "El contenido se ha creado correctamente",
        });
      }
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: editingContent ? "Error al actualizar contenido" : "Error al crear contenido",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (content: ContentItem) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${content.title}"?`)) {
      return;
    }

    try {
      await deleteContentMutation.mutateAsync(content.id);
      toast({
        title: "Contenido eliminado",
        description: "El contenido se ha eliminado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar contenido",
        variant: "destructive",
      });
    }
  };

  const openVideo = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestión de Contenido</h1>
        <p className="text-muted-foreground">Administra la biblioteca de videos y contenido</p>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <Label htmlFor="categoryFilter">Filtrar por categoría:</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Contenido
        </Button>
      </div>

      {/* Content Form */}
      {isFormOpen && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {editingContent ? 'Editar Contenido' : 'Crear Nuevo Contenido'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Nombre del ejercicio o contenido"
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subcategory */}
                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategoría</Label>
                  <Input
                    id="subcategory"
                    value={formData.subcategory}
                    onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                    placeholder="Ej: Pecho, Espalda, Piernas"
                  />
                </div>

                {/* Active Status */}
                <div className="space-y-2">
                  <Label htmlFor="isActive">Estado</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <span>{formData.is_active ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </div>

                {/* Video URL */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="videoUrl">URL del Video</Label>
                  <div className="flex gap-2">
                    <Input
                      id="videoUrl"
                      value={formData.video_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                    {formData.video_url && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openVideo(formData.video_url)}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {getYouTubeThumbnail(formData.video_url) && (
                    <div className="mt-2">
                      <img
                        src={getYouTubeThumbnail(formData.video_url)!}
                        alt="Video preview"
                        className="w-32 h-20 object-cover rounded border"
                      />
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción del ejercicio o instrucciones"
                    rows={4}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createContentMutation.isPending || updateContentMutation.isPending}
                >
                  {editingContent ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Content List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="text-lg">Cargando contenido...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContent.map((content) => {
            const thumbnail = getYouTubeThumbnail(content.video_url);
            const categoryLabel = categories.find(cat => cat.value === content.category)?.label || content.category;

            return (
              <Card key={content.id} className="overflow-hidden">
                <CardHeader className="p-0">
                  {thumbnail ? (
                    <div className="relative">
                      <img
                        src={thumbnail}
                        alt={content.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          onClick={() => content.video_url && openVideo(content.video_url)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Ver Video
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 bg-gray-200 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <Eye className="w-8 h-8 mx-auto mb-2" />
                        <p>Sin vista previa</p>
                      </div>
                    </div>
                  )}
                </CardHeader>
                
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-lg line-clamp-2">
                        {content.title}
                      </h3>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(content)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(content)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {categoryLabel}
                        {content.subcategory && ` • ${content.subcategory}`}
                      </span>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        content.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {content.is_active ? 'Activo' : 'Inactivo'}
                      </div>
                    </div>

                    {content.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {content.description}
                      </p>
                    )}

                    <div className="text-xs text-muted-foreground">
                      Creado: {new Date(content.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredContent.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="text-lg mb-2">No hay contenido disponible</div>
          <p className="text-muted-foreground mb-4">
            {selectedCategory === 'all' 
              ? 'Aún no se ha agregado ningún contenido'
              : `No hay contenido en la categoría seleccionada`
            }
          </p>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Primer Contenido
          </Button>
        </div>
      )}
    </div>
  );
};

export default ContentManagement;
