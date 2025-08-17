import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAddOrUpdateDay } from '@/hooks/api/use-training-plan';
import type { TrainingPlanDay } from '@/hooks/api/use-training-plan';
import { ExerciseEditor } from './ExerciseEditor';
import { ArrowLeft, Calendar, Save, Plus } from 'lucide-react';

interface TrainingDayEditorProps {
  day: TrainingPlanDay;
  userId: number;
  onBack: () => void;
}

export const TrainingDayEditor: React.FC<TrainingDayEditorProps> = ({
  day,
  userId,
  onBack,
}) => {
  const { toast } = useToast();
  const [title, setTitle] = React.useState(day.title || `Día ${day.day_index}`);
  const [notes, setNotes] = React.useState(day.notes || '');
  const [showExerciseEditor, setShowExerciseEditor] = React.useState(false);
  const [selectedExercise, setSelectedExercise] = React.useState<any>(null);

  const updateDayMutation = useAddOrUpdateDay(userId);

  const handleSaveDay = async () => {
    try {
      await updateDayMutation.mutateAsync({
        planId: day.plan_id,
        day_index: day.day_index,
        title,
        notes,
        sort_order: day.sort_order
      });

      toast({
        title: "Día actualizado",
        description: "Los cambios se han guardado exitosamente",
        variant: "default",
      });
    } catch (error) {
      console.error('Error saving day:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive",
      });
    }
  };

  const handleAddExercise = () => {
    setSelectedExercise(null);
    setShowExerciseEditor(true);
  };

  const handleEditExercise = (exercise: any) => {
    setSelectedExercise(exercise);
    setShowExerciseEditor(true);
  };

  if (showExerciseEditor) {
    return (
      <ExerciseEditor
        day={day}
        exercise={selectedExercise}
        userId={userId}
        onBack={() => setShowExerciseEditor(false)}
      />
    );
  }

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
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Editar {title}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Day Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración del Día</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Título del día</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Día ${day.day_index}`}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas/Instrucciones</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Entrenar con intensidad moderada, descansar bien entre series..."
              rows={3}
            />
          </div>

          <Button onClick={handleSaveDay} disabled={updateDayMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {updateDayMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </CardContent>
      </Card>

      {/* Exercises */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Ejercicios ({day.exercises.length})
            </CardTitle>
            <Button onClick={handleAddExercise}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Ejercicio
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {day.exercises.length > 0 ? (
            <div className="space-y-4">
              {day.exercises
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((exercise, index) => (
                  <Card key={exercise.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium mb-2">{exercise.exercise_name}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          {exercise.sets && exercise.reps && (
                            <div>
                              <span className="font-medium">Series × Reps:</span>
                              <br />
                              {exercise.sets} × {exercise.reps}
                            </div>
                          )}
                          {exercise.intensity && (
                            <div>
                              <span className="font-medium">Intensidad:</span>
                              <br />
                              {exercise.intensity}
                            </div>
                          )}
                          {exercise.rest_seconds && (
                            <div>
                              <span className="font-medium">Descanso:</span>
                              <br />
                              {exercise.rest_seconds}s
                            </div>
                          )}
                          {exercise.tempo && (
                            <div>
                              <span className="font-medium">Tempo:</span>
                              <br />
                              {exercise.tempo}
                            </div>
                          )}
                        </div>
                        {exercise.notes && (
                          <div className="mt-2">
                            <span className="text-sm font-medium">Notas: </span>
                            <span className="text-sm text-muted-foreground">{exercise.notes}</span>
                          </div>
                        )}
                        {(exercise.content_library_id || exercise.youtube_url) && (
                          <div className="mt-2">
                            <span className="text-sm font-medium">Video: </span>
                            <span className="text-sm text-blue-600">
                              {exercise.content_title || 'Enlace disponible'}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditExercise(exercise)}
                      >
                        Editar
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                No hay ejercicios en este día
              </h3>
              <p className="text-muted-foreground mb-4">
                Agrega ejercicios para completar el plan del día
              </p>
              <Button onClick={handleAddExercise}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primer Ejercicio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
