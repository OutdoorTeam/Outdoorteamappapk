import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save, Search } from 'lucide-react';
import { useAddOrUpdateExercise } from '@/hooks/api/use-training-plan';
import { useContentLibrary } from '@/hooks/api/use-content-library';
import { useToast } from '@/hooks/use-toast';

interface ExerciseEditorProps {
  dayId: number;
  userId: number;
  exercise?: any;
  onClose: () => void;
}

export const ExerciseEditor: React.FC<ExerciseEditorProps> = ({
  dayId,
  userId,
  exercise,
  onClose
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = React.useState({
    exercise_name: '',
    content_library_id: null as number | null,
    youtube_url: '',
    sets: null as number | null,
    reps: '',
    intensity: '',
    rest_seconds: null as number | null,
    tempo: '',
    notes: '',
    sort_order: 0
  });

  const addOrUpdateMutation = useAddOrUpdateExercise(userId);
  const { data: contentLibrary } = useContentLibrary();

  // Initialize form with exercise data
  React.useEffect(() => {
    if (exercise) {
      setFormData({
        exercise_name: exercise.exercise_name || '',
        content_library_id: exercise.content_library_id || null,
        youtube_url: exercise.youtube_url || '',
        sets: exercise.sets || null,
        reps: exercise.reps || '',
        intensity: exercise.intensity || '',
        rest_seconds: exercise.rest_seconds || null,
        tempo: exercise.tempo || '',
        notes: exercise.notes || '',
        sort_order: exercise.sort_order || 0
      });
    }
  }, [exercise]);

  const handleSave = async () => {
    if (!formData.exercise_name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del ejercicio es requerido",
        variant: "destructive",
      });
      return;
    }

    // Validate YouTube URL if provided
    if (formData.youtube_url && !isValidYouTubeUrl(formData.youtube_url)) {
      toast({
        title: "Error",
        description: "La URL de YouTube no es válida",
        variant: "destructive",
      });
      return;
    }

    try {
      await addOrUpdateMutation.mutateAsync({
        dayId,
        exerciseData: {
          ...(exercise && { id: exercise.id }),
          ...formData
        }
      });

      toast({
        title: "Ejercicio guardado",
        description: exercise ? "Ejercicio actualizado correctamente" : "Ejercicio agregado correctamente",
        variant: "success",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el ejercicio",
        variant: "destructive",
      });
    }
  };

  const handleContentLibrarySelect = (contentId: string) => {
    const selectedContent = contentLibrary?.find(c => c.id === parseInt(contentId));
    if (selectedContent) {
      setFormData(prev => ({
        ...prev,
        content_library_id: selectedContent.id,
        youtube_url: '', // Clear YouTube URL when selecting from library
      }));
    }
  };

  const isValidYouTubeUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return (
        (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') ||
        (urlObj.hostname === 'youtu.be')
      );
    } catch {
      return false;
    }
  };

  const intensityOptions = [
    { value: 'baja', label: 'Baja' },
    { value: 'media', label: 'Media' },
    { value: 'alta', label: 'Alta' },
    { value: 'RPE6', label: 'RPE 6' },
    { value: 'RPE7', label: 'RPE 7' },
    { value: 'RPE8', label: 'RPE 8' },
    { value: 'RPE9', label: 'RPE 9' },
    { value: 'RPE10', label: 'RPE 10' },
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {exercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Exercise Name */}
        <div>
          <label className="text-sm font-medium mb-1 block">
            Nombre del ejercicio *
          </label>
          <Input
            value={formData.exercise_name}
            onChange={(e) => setFormData(prev => ({ ...prev, exercise_name: e.target.value }))}
            placeholder="Ej: Sentadillas con barra"
          />
        </div>

        {/* Video Source */}
        <div className="space-y-4">
          <label className="text-sm font-medium block">Fuente de video</label>
          
          {/* Content Library Selection */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Seleccionar de biblioteca de contenido
            </label>
            <Select 
              value={formData.content_library_id?.toString() || ''} 
              onValueChange={handleContentLibrarySelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Buscar en biblioteca..." />
              </SelectTrigger>
              <SelectContent>
                {contentLibrary?.filter(c => c.category === 'exercise').map(content => (
                  <SelectItem key={content.id} value={content.id.toString()}>
                    {content.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            — O —
          </div>

          {/* YouTube URL */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              URL de YouTube
            </label>
            <Input
              value={formData.youtube_url}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                youtube_url: e.target.value,
                content_library_id: e.target.value ? null : prev.content_library_id // Clear library selection
              }))}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={!!formData.content_library_id}
            />
          </div>
        </div>

        {/* Exercise Parameters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Series</label>
            <Input
              type="number"
              value={formData.sets || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                sets: e.target.value ? parseInt(e.target.value) : null 
              }))}
              placeholder="Ej: 3"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Repeticiones</label>
            <Input
              value={formData.reps}
              onChange={(e) => setFormData(prev => ({ ...prev, reps: e.target.value }))}
              placeholder="Ej: 10-12, AMRAP"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Intensidad</label>
            <Select 
              value={formData.intensity} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, intensity: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {intensityOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Descanso (seg)</label>
            <Input
              type="number"
              value={formData.rest_seconds || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                rest_seconds: e.target.value ? parseInt(e.target.value) : null 
              }))}
              placeholder="Ej: 90"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Tempo (opcional)</label>
          <Input
            value={formData.tempo}
            onChange={(e) => setFormData(prev => ({ ...prev, tempo: e.target.value }))}
            placeholder="Ej: 3-1-2-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Notas (opcional)</label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Instrucciones especiales, variaciones, etc..."
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={addOrUpdateMutation.isPending || !formData.exercise_name.trim()}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {exercise ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
