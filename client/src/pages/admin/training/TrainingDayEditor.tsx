import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useContentLibrary } from '@/hooks/api/use-content-library';
import { useAddOrUpdateExercise, useDeleteExercise } from '@/hooks/api/use-training-plan';
import { ArrowLeft, Plus, Trash2, Play } from 'lucide-react';

interface Exercise {
  id?: number;
  sort_order: number;
  exercise_name: string;
  content_library_id: number | null;
  youtube_url: string | null;
  sets: number | null;
  reps: string | null;
  intensity: string | null;
  rest_seconds: number | null;
  tempo: string | null;
  notes: string | null;
}

interface TrainingDay {
  id: number;
  title: string | null;
  exercises?: Exercise[];
}

interface TrainingDayEditorProps {
  day: TrainingDay;
  userId: number;
  onBack: () => void;
}

const TrainingDayEditor: React.FC<TrainingDayEditorProps> = ({ day, userId, onBack }) => {
  const { toast } = useToast();
  const [exercises, setExercises] = React.useState<Exercise[]>(day.exercises || []);
  
  const { data: contentLibrary } = useContentLibrary('exercise');
  const addOrUpdateExerciseMutation = useAddOrUpdateExercise(userId);
  const deleteExerciseMutation = useDeleteExercise(userId);

  const intensityOptions = ['baja', 'media', 'alta', 'RPE6', 'RPE7', 'RPE8', 'RPE9', 'RPE10'];

  const handleAddExercise = () => {
    const newExercise: Exercise = {
      sort_order: exercises.length,
      exercise_name: '',
      content_library_id: null,
      youtube_url: null,
      sets: null,
      reps: null,
      intensity: null,
      rest_seconds: null,
      tempo: null,
      notes: null
    };
    setExercises([...exercises, newExercise]);
  };

  const handleRemoveExercise = async (exerciseId: number | undefined, index: number) => {
    if (exerciseId) {
      try {
        await deleteExerciseMutation.mutateAsync(exerciseId);
        toast({ title: "Ejercicio eliminado" });
      } catch (error) {
        toast({ title: "Error", description: "No se pudo eliminar el ejercicio", variant: "destructive" });
        return;
      }
    }
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleExerciseChange = (index: number, field: keyof Exercise, value: any) => {
    const updatedExercises = [...exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: value };
    setExercises(updatedExercises);
  };

  const handleContentLibrarySelect = (index: number, contentId: string) => {
    const updatedExercises = [...exercises];
    const exercise = updatedExercises[index];

    if (contentId === 'custom') {
      exercise.content_library_id = null;
      exercise.youtube_url = null;
    } else {
      const contentItem = contentLibrary?.find(item => item.id === parseInt(contentId));
      if (contentItem) {
        exercise.content_library_id = contentItem.id;
        exercise.exercise_name = contentItem.title;
        exercise.youtube_url = contentItem.video_url;
      }
    }
    setExercises(updatedExercises);
  };

  const handleSaveExercise = async (index: number) => {
    const exercise = exercises[index];
    if (!exercise.exercise_name.trim()) {
      toast({ title: "Error", description: "El nombre del ejercicio es requerido", variant: "destructive" });
      return;
    }

    try {
      await addOrUpdateExerciseMutation.mutateAsync({
        dayId: day.id,
        exerciseData: exercise
      });
      toast({ title: "Ejercicio guardado" });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo guardar el ejercicio", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            Editor del Día: {day.title || 'Día de Entrenamiento'}
          </CardTitle>
          <Button onClick={handleAddExercise}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Ejercicio
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {exercises.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No hay ejercicios para este día. ¡Agrega el primero!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {exercises.map((exercise, index) => (
              <Card key={index} className="p-4 border-2">
                <div className="flex items-start justify-between mb-4">
                  <h4 className="font-medium text-lg">Ejercicio {index + 1}</h4>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveExercise(index)}
                      disabled={addOrUpdateExerciseMutation.isPending}
                    >
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveExercise(exercise.id, index)}
                      disabled={deleteExerciseMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Exercise Selection */}
                  <div className="space-y-2">
                    <Label>Ejercicio</Label>
                    <Select
                      value={exercise.content_library_id?.toString() || 'custom'}
                      onValueChange={(value) => handleContentLibrarySelect(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar ejercicio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Ejercicio personalizado</SelectItem>
                        {contentLibrary?.map(item => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Exercise Name */}
                  <div className="space-y-2">
                    <Label>Nombre del Ejercicio</Label>
                    <Input
                      value={exercise.exercise_name}
                      onChange={(e) => handleExerciseChange(index, 'exercise_name', e.target.value)}
                      placeholder="Nombre del ejercicio"
                    />
                  </div>

                  {/* Video URL */}
                  <div className="space-y-2">
                    <Label>URL del Video</Label>
                    <div className="flex gap-2">
                      <Input
                        value={exercise.youtube_url || ''}
                        onChange={(e) => handleExerciseChange(index, 'youtube_url', e.target.value)}
                        placeholder="https://youtube.com/..."
                      />
                      {exercise.youtube_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(exercise.youtube_url!, '_blank')}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Sets, Reps, Rest */}
                  <div className="space-y-2">
                    <Label>Series</Label>
                    <Input
                      type="number"
                      value={exercise.sets || ''}
                      onChange={(e) => handleExerciseChange(index, 'sets', parseInt(e.target.value) || null)}
                      placeholder="3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Repeticiones</Label>
                    <Input
                      value={exercise.reps || ''}
                      onChange={(e) => handleExerciseChange(index, 'reps', e.target.value)}
                      placeholder="10-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descanso (seg)</Label>
                    <Input
                      type="number"
                      value={exercise.rest_seconds || ''}
                      onChange={(e) => handleExerciseChange(index, 'rest_seconds', parseInt(e.target.value) || null)}
                      placeholder="60"
                    />
                  </div>

                  {/* Intensity, Tempo, Notes */}
                  <div className="space-y-2">
                    <Label>Intensidad</Label>
                    <Select
                      value={exercise.intensity || ''}
                      onValueChange={(value) => handleExerciseChange(index, 'intensity', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar intensidad" />
                      </SelectTrigger>
                      <SelectContent>
                        {intensityOptions.map(intensity => (
                          <SelectItem key={intensity} value={intensity}>
                            {intensity}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tempo</Label>
                    <Input
                      value={exercise.tempo || ''}
                      onChange={(e) => handleExerciseChange(index, 'tempo', e.target.value)}
                      placeholder="Ej: 2-0-1-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notas</Label>
                    <Textarea
                      value={exercise.notes || ''}
                      onChange={(e) => handleExerciseChange(index, 'notes', e.target.value)}
                      placeholder="Notas adicionales..."
                      rows={2}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrainingDayEditor;
