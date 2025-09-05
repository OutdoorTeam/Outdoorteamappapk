import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useContentLibrary } from '@/hooks/api/use-content-library';
import { useAddOrUpdateExercise, useDeleteExercise, TrainingExercise } from '@/hooks/api/use-training-plan';
import { Save, Trash2, Link, Dumbbell } from 'lucide-react';

interface ExerciseEditorProps {
  dayId: number;
  userId: number;
  exercise?: TrainingExercise;
  onClose: () => void;
}

const ExerciseEditor: React.FC<ExerciseEditorProps> = ({ dayId, userId, exercise, onClose }) => {
  const { toast } = useToast();
  const [formData, setFormData] = React.useState({
    exercise_name: exercise?.exercise_name || '',
    content_library_id: exercise?.content_library_id || null,
    youtube_url: exercise?.youtube_url || '',
    sets: exercise?.sets || null,
    reps: exercise?.reps || '',
    intensity: exercise?.intensity || '',
    rest_seconds: exercise?.rest_seconds || null,
    tempo: exercise?.tempo || '',
    notes: exercise?.notes || '',
    sort_order: exercise?.sort_order || 0
  });

  const { data: contentLibrary } = useContentLibrary('exercise');
  const addOrUpdateMutation = useAddOrUpdateExercise(userId);
  const deleteExerciseMutation = useDeleteExercise(userId);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.exercise_name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del ejercicio es requerido",
        variant: "destructive",
      });
      return;
    }

    // Validate dayId
    if (!dayId || dayId <= 0) {
      console.error('Invalid dayId in ExerciseEditor:', dayId);
      toast({
        title: "Error",
        description: "ID de día inválido. Por favor, recarga la página.",
        variant: "destructive",
      });
      return;
    }

    try {
      const exerciseData: any = {
        ...formData,
        content_library_id: formData.content_library_id || null,
        sets: formData.sets || null,
        rest_seconds: formData.rest_seconds || null
      };

      // If updating, include the ID
      if (exercise?.id) {
        exerciseData.id = exercise.id;
      }

      console.log('Saving exercise with dayId:', dayId, 'data:', exerciseData);

      await addOrUpdateMutation.mutateAsync({
        dayId,
        exerciseData
      });

      toast({
        title: "Ejercicio guardado",
        description: "El ejercicio se ha guardado exitosamente",
        variant: "default",
      });

      onClose();
    } catch (error: any) {
      console.error('Error saving exercise:', error);
      
      const errorMessage = error?.message || 'No se pudo guardar el ejercicio';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!exercise?.id) return;

    if (!confirm('¿Estás seguro de que quieres eliminar este ejercicio?')) {
      return;
    }

    try {
      await deleteExerciseMutation.mutateAsync(exercise.id);

      toast({
        title: "Ejercicio eliminado",
        description: "El ejercicio se ha eliminado exitosamente",
        variant: "default",
      });

      onClose();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el ejercicio",
        variant: "destructive",
      });
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
    { value: 'RPE10', label: 'RPE 10' }
  ];

  // Debug information
  console.log('ExerciseEditor props:', { dayId, userId, exercise: exercise?.id });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5" />
          {exercise ? 'Editar Ejercicio' : 'Agregar Ejercicio'}
          {dayId && <span className="text-sm text-muted-foreground">(Día ID: {dayId})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Exercise Name */}
        <div className="space-y-2">
          <Label htmlFor="exercise_name">Nombre del Ejercicio *</Label>
          <Input
            id="exercise_name"
            value={formData.exercise_name}
            onChange={(e) => handleInputChange('exercise_name', e.target.value)}
            placeholder="Nombre del ejercicio"
          />
        </div>

        {/* Content Library Selection */}
        <div className="space-y-2">
          <Label htmlFor="content_library">Video desde Biblioteca (opcional)</Label>
          <Select
            value={formData.content_library_id?.toString() || 'none'}
            onValueChange={(value) => handleInputChange('content_library_id', value === 'none' ? null : parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar video de biblioteca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin video de biblioteca</SelectItem>
              {contentLibrary?.map((item) => (
                <SelectItem key={item.id} value={item.id.toString()}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* YouTube URL */}
        <div className="space-y-2">
          <Label htmlFor="youtube_url">URL de YouTube (opcional)</Label>
          <Input
            id="youtube_url"
            type="url"
            value={formData.youtube_url}
            onChange={(e) => handleInputChange('youtube_url', e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        {/* Sets and Reps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sets">Series</Label>
            <Input
              id="sets"
              type="number"
              min="1"
              max="20"
              value={formData.sets || ''}
              onChange={(e) => handleInputChange('sets', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="3"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reps">Repeticiones</Label>
            <Input
              id="reps"
              value={formData.reps}
              onChange={(e) => handleInputChange('reps', e.target.value)}
              placeholder="8-12, 30s, etc."
            />
          </div>
        </div>

        {/* Intensity and Rest */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="intensity">Intensidad</Label>
            <Select
              value={formData.intensity || 'none'}
              onValueChange={(value) => handleInputChange('intensity', value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar intensidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin especificar</SelectItem>
                {intensityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="rest_seconds">Descanso (segundos)</Label>
            <Input
              id="rest_seconds"
              type="number"
              min="0"
              max="600"
              value={formData.rest_seconds || ''}
              onChange={(e) => handleInputChange('rest_seconds', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="60"
            />
          </div>
        </div>

        {/* Tempo */}
        <div className="space-y-2">
          <Label htmlFor="tempo">Tempo (opcional)</Label>
          <Input
            id="tempo"
            value={formData.tempo}
            onChange={(e) => handleInputChange('tempo', e.target.value)}
            placeholder="2-1-2-1"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Notas adicionales sobre el ejercicio"
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4">
          <Button 
            onClick={handleSave}
            disabled={addOrUpdateMutation.isPending || !dayId}
          >
            <Save className="w-4 h-4 mr-2" />
            {addOrUpdateMutation.isPending ? 'Guardando...' : 'Guardar Ejercicio'}
          </Button>
          
          {exercise && (
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteExerciseMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Cancelar
          </Button>
        </div>

        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
            <strong>Debug info:</strong> dayId={dayId}, userId={userId}, exerciseId={exercise?.id || 'new'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExerciseEditor;
