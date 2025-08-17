import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Save, Edit, Trash2, GripVertical } from 'lucide-react';
import { useAddOrUpdateDay, useAddOrUpdateExercise, useDeleteExercise } from '@/hooks/api/use-training-plan';
import { useToast } from '@/hooks/use-toast';
import { ExerciseEditor } from './ExerciseEditor';

interface TrainingDayEditorProps {
  planId: number;
  dayIndex: number;
  userId: number;
  existingDay?: any;
}

export const TrainingDayEditor: React.FC<TrainingDayEditorProps> = ({
  planId,
  dayIndex,
  userId,
  existingDay
}) => {
  const { toast } = useToast();
  const [dayTitle, setDayTitle] = React.useState('');
  const [dayNotes, setDayNotes] = React.useState('');
  const [editingExercise, setEditingExercise] = React.useState<any>(null);
  const [showExerciseForm, setShowExerciseForm] = React.useState(false);
  
  const updateDayMutation = useAddOrUpdateDay(userId);
  const deleteExerciseMutation = useDeleteExercise(userId);

  // Initialize form with existing data
  React.useEffect(() => {
    if (existingDay) {
      setDayTitle(existingDay.title || `Día ${dayIndex}`);
      setDayNotes(existingDay.notes || '');
    } else {
      setDayTitle(`Día ${dayIndex}`);
      setDayNotes('');
    }
    setEditingExercise(null);
    setShowExerciseForm(false);
  }, [dayIndex, existingDay]);

  const handleSaveDay = async () => {
    try {
      await updateDayMutation.mutateAsync({
        planId,
        day_index: dayIndex,
        title: dayTitle,
        notes: dayNotes,
        sort_order: dayIndex
      });

      toast({
        title: "Día guardado",
        description: `Día ${dayIndex} actualizado correctamente`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el día",
        variant: "destructive",
      });
    }
  };

  const handleEditExercise = (exercise: any) => {
    setEditingExercise(exercise);
    setShowExerciseForm(true);
  };

  const handleAddExercise = () => {
    setEditingExercise(null);
    setShowExerciseForm(true);
  };

  const handleCloseExerciseForm = () => {
    setEditingExercise(null);
    setShowExerciseForm(false);
  };

  const handleDeleteExercise = async (exerciseId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este ejercicio?')) return;

    try {
      await deleteExerciseMutation.mutateAsync(exerciseId);
      toast({
        title: "Ejercicio eliminado",
        description: "El ejercicio se ha eliminado correctamente",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el ejercicio",
        variant: "destructive",
      });
    }
  };

  const exercises = existingDay?.exercises || [];

  return (
    <div className="space-y-6">
      {/* Day Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuración del Día {dayIndex}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Título del día</label>
            <Input
              value={dayTitle}
              onChange={(e) => setDayTitle(e.target.value)}
              placeholder={`Día ${dayIndex}`}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Notas (opcional)</label>
            <Textarea
              value={dayNotes}
              onChange={(e) => setDayNotes(e.target.value)}
              placeholder="Instrucciones especiales, calentamiento, etc..."
              rows={3}
            />
          </div>

          <Button
            onClick={handleSaveDay}
            disabled={updateDayMutation.isPending}
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar Día
          </Button>
        </CardContent>
      </Card>

      {/* Exercises */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Ejercicios ({exercises.length})
            </CardTitle>
            <Button onClick={handleAddExercise} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Ejercicio
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {exercises.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No hay ejercicios para este día
              </p>
              <Button onClick={handleAddExercise} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Agregar primer ejercicio
              </Button>
            </div>
          ) : (
            exercises.map((exercise: any, index: number) => (
              <div key={exercise.id} className="flex items-start gap-3 p-4 border rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{exercise.exercise_name}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {exercise.sets && <span>{exercise.sets} series</span>}
                        {exercise.reps && <span>{exercise.reps} reps</span>}
                        {exercise.intensity && (
                          <span className="bg-muted px-2 py-0.5 rounded text-xs">
                            {exercise.intensity}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditExercise(exercise)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteExercise(exercise.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {exercise.notes && (
                    <p className="text-sm text-muted-foreground">{exercise.notes}</p>
                  )}

                  {(exercise.content_title || exercise.youtube_url) && (
                    <div className="text-sm text-blue-600">
                      {exercise.content_title ? 
                        `📹 ${exercise.content_title}` : 
                        '🎬 Video de YouTube'
                      }
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Exercise Form Modal/Dialog */}
      {showExerciseForm && existingDay && (
        <ExerciseEditor
          dayId={existingDay.id}
          userId={userId}
          exercise={editingExercise}
          onClose={handleCloseExerciseForm}
        />
      )}
    </div>
  );
};
