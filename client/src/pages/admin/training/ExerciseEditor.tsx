import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAddOrUpdateExercise, useDeleteExercise } from '@/hooks/api/use-training-plan';
import { useContentLibrary } from '@/hooks/api/use-content-library';
import type { TrainingPlanDay, TrainingExercise } from '@/hooks/api/use-training-plan';
import { ArrowLeft, Save, Trash2, Play, Search } from 'lucide-react';

interface ExerciseEditorProps {
  day: TrainingPlanDay;
  exercise?: TrainingExercise | null;
  userId: number;
  onBack: () => void;
}

const ExerciseEditor: React.FC<ExerciseEditorProps> = ({
  day,
  exercise,
  userId,
  onBack,
}) => {
  const { toast } = useToast();
  const isEditing = !!exercise;

  // Form state
  const [exerciseName, setExerciseName] = React.useState(exercise?.exercise_name || '');
  const [sets, setSets] = React.useState(exercise?.sets?.toString() || '');
  const [reps, setReps] = React.useState(exercise?.reps || '');
  const [intensity, setIntensity] = React.useState(exercise?.intensity || '');
  const [restSeconds, setRestSeconds] = React.useState(exercise?.rest_seconds?.toString() || '');
  const [tempo, setTempo] = React.useState(exercise?.tempo || '');
  const [notes, setNotes] = React.useState(exercise?.notes || '');
  const [youtubeUrl, setYoutubeUrl] = React.useState(exercise?.youtube_url || '');
  const [selectedLibraryId, setSelectedLibraryId] = React.useState<number | null>(
    exercise?.content_library_id || null
  );

  // API hooks
  const { data: contentLibrary } = useContentLibrary();
  const addOrUpdateExerciseMutation = useAddOrUpdateExercise(userId);
  const deleteExerciseMutation = useDeleteExercise(userId);

  const handleSave = async () => {
    if (!exerciseName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del ejercicio es requerido",
        variant: "destructive",
      });
      return;
    }

    try {
      const exerciseData = {
        id: exercise?.id,
        exercise_name: exerciseName.trim(),
        content_library_id: selectedLibraryId,
        youtube_url: youtubeUrl.trim() || null,
        sets: sets ? parseInt(sets) : null,
        reps: reps.trim() || null,
        intensity: intensity || null,
        rest_seconds: restSeconds ? parseInt(restSeconds) : null,
        tempo: tempo.trim() || null,
        notes: notes.trim() || null,
        sort_order: exercise?.sort_order || day.exercises.length
      };

      await addOrUpdateExerciseMutation.mutateAsync({
        dayId: day.id,
        exerciseData
      });

      toast({
        title: isEditing ? "Ejercicio actualizado" : "Ejercicio agregado",
        description: "Los cambios se han guardado exitosamente",
        variant: "default",
      });

      onBack();
    } catch (error) {
      console.error('Error saving exercise:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el ejercicio",
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
        description: "El ejercicio ha sido eliminado exitosamente",
        variant: "default",
      });

      onBack();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el ejercicio",
        variant: "destructive",
      });
    }
  };

  const handleLibrarySelect = (value: string) => {
    const libraryId = value === 'none' ? null : parseInt(value);
    setSelectedLibraryId(libraryId);
    
    if (libraryId && contentLibrary) {
      const selectedItem = contentLibrary.find(item => item.id === libraryId);
      if (selectedItem && selectedItem.video_url) {
        setYoutubeUrl(''); // Clear YouTube URL if selecting from library
      }
    }
  };

  const exerciseLibraryItems = contentLibrary?.filter(item => 
    item.category === 'exercise' && item.is_active
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <CardTitle>
                {isEditing ? 'Editar Ejercicio' : 'Agregar Ejercicio'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {day.title || `Día ${day.day_index}`}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Exercise Form */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Ejercicio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Exercise Name */}
          <div>
            <Label htmlFor="exercise-name">Nombre del ejercicio *</Label>
            <Input
              id="exercise-name"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder="Ej: Press de banca con mancuernas"
            />
          </div>

          {/* Video Selection */}
          <div className="space-y-4">
            <Label>Video de referencia</Label>
            
            <div>
              <Label htmlFor="library-select">Desde la biblioteca de contenidos</Label>
              <Select value={selectedLibraryId?.toString() || 'none'} onValueChange={handleLibrarySelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar desde biblioteca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {exerciseLibraryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        {item.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!selectedLibraryId && (
              <div>
                <Label htmlFor="youtube-url">O URL de YouTube</Label>
                <Input
                  id="youtube-url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
            )}
          </div>

          {/* Exercise Parameters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="sets">Series</Label>
              <Input
                id="sets"
                type="number"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                placeholder="3"
                min="1"
                max="20"
              />
            </div>

            <div>
              <Label htmlFor="reps">Repeticiones</Label>
              <Input
                id="reps"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="10-12"
              />
            </div>

            <div>
              <Label htmlFor="intensity">Intensidad</Label>
              <Select value={intensity} onValueChange={setIntensity}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Ninguna</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="RPE6">RPE 6</SelectItem>
                  <SelectItem value="RPE7">RPE 7</SelectItem>
                  <SelectItem value="RPE8">RPE 8</SelectItem>
                  <SelectItem value="RPE9">RPE 9</SelectItem>
                  <SelectItem value="RPE10">RPE 10</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rest">Descanso (seg)</Label>
              <Input
                id="rest"
                type="number"
                value={restSeconds}
                onChange={(e) => setRestSeconds(e.target.value)}
                placeholder="90"
                min="0"
                max="600"
              />
            </div>
          </div>

          {/* Tempo */}
          <div>
            <Label htmlFor="tempo">Tempo</Label>
            <Input
              id="tempo"
              value={tempo}
              onChange={(e) => setTempo(e.target.value)}
              placeholder="Ej: 2-1-2-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Formato: excéntrico-pausa-concéntrico-pausa (ej: 2-1-2-1)
            </p>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notas/Instrucciones</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones especiales, modificaciones, etc."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              {isEditing && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteExerciseMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteExerciseMutation.isPending ? 'Eliminando...' : 'Eliminar Ejercicio'}
                </Button>
              )}
            </div>
            
            <Button
              onClick={handleSave}
              disabled={addOrUpdateExerciseMutation.isPending || !exerciseName.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              {addOrUpdateExerciseMutation.isPending 
                ? 'Guardando...' 
                : isEditing 
                  ? 'Actualizar Ejercicio' 
                  : 'Guardar Ejercicio'
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExerciseEditor;
