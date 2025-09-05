import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  useAddOrUpdateDay,
  TrainingPlanDay,
  TrainingExercise
} from '@/hooks/api/use-training-plan';
import ExerciseEditor from './ExerciseEditor';
import { ArrowLeft, Plus, Edit, Trash2, Save, Play, Dumbbell } from 'lucide-react';

interface TrainingDayEditorProps {
  day: TrainingPlanDay;
  userId: number;
  onBack: () => void;
}

const TrainingDayEditor: React.FC<TrainingDayEditorProps> = ({ day, userId, onBack }) => {
  const { toast } = useToast();
  const [dayTitle, setDayTitle] = React.useState(day.title || '');
  const [dayNotes, setDayNotes] = React.useState(day.notes || '');
  const [showExerciseEditor, setShowExerciseEditor] = React.useState(false);
  const [editingExercise, setEditingExercise] = React.useState<TrainingExercise | undefined>(undefined);
  
  const addOrUpdateDayMutation = useAddOrUpdateDay(userId);

  // Validate day object
  React.useEffect(() => {
    console.log('TrainingDayEditor received day:', day);
    if (!day?.id) {
      console.error('Invalid day object received in TrainingDayEditor:', day);
      toast({
        title: "Error",
        description: "Día inválido. Regresando a la vista principal.",
        variant: "destructive",
      });
      onBack();
    }
  }, [day, onBack, toast]);

  const handleSaveDay = async () => {
    if (!day?.id) {
      toast({
        title: "Error",
        description: "No se puede guardar un día inválido",
        variant: "destructive",
      });
      return;
    }

    try {
      await addOrUpdateDayMutation.mutateAsync({
        planId: day.plan_id,
        day_index: day.day_index,
        title: dayTitle.trim() || `Día ${day.day_index}`,
        notes: dayNotes.trim() || undefined,
        sort_order: day.sort_order
      });

      toast({
        title: "Día guardado",
        description: "Los cambios del día se han guardado exitosamente",
        variant: "default",
      });
    } catch (error) {
      console.error('Error saving day:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el día",
        variant: "destructive",
      });
    }
  };

  const handleEditExercise = (exercise: TrainingExercise) => {
    console.log('Editing exercise:', exercise, 'for day:', day.id);
    setEditingExercise(exercise);
    setShowExerciseEditor(true);
  };

  const handleAddExercise = () => {
    console.log('Adding new exercise for day:', day.id);
    setEditingExercise(undefined);
    setShowExerciseEditor(true);
  };

  const handleCloseExerciseEditor = () => {
    setShowExerciseEditor(false);
    setEditingExercise(undefined);
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'baja':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'media':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'alta':
      case 'RPE9':
      case 'RPE10':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'RPE7':
      case 'RPE8':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const exercises = day.exercises || [];

  if (!day?.id) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600">Error: Día inválido</p>
          <Button onClick={onBack} className="mt-4">Volver</Button>
        </CardContent>
      </Card>
    );
  }

  if (showExerciseEditor) {
    return (
      <ExerciseEditor
        dayId={day.id}
        userId={userId}
        exercise={editingExercise}
        onClose={handleCloseExerciseEditor}
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
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Plan
            </Button>
            <div className="flex-1">
              <CardTitle>
                Editando: {dayTitle || `Día ${day.day_index}`}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Día ID: {day.id} | Plan ID: {day.plan_id} | Índice: {day.day_index}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Day Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles del Día</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="day-title">Título del Día</Label>
            <Input
              id="day-title"
              value={dayTitle}
              onChange={(e) => setDayTitle(e.target.value)}
              placeholder={`Día ${day.day_index}`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="day-notes">Notas del Día</Label>
            <Textarea
              id="day-notes"
              value={dayNotes}
              onChange={(e) => setDayNotes(e.target.value)}
              placeholder="Notas o instrucciones especiales para este día"
              rows={3}
            />
          </div>

          <Button 
            onClick={handleSaveDay}
            disabled={addOrUpdateDayMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {addOrUpdateDayMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </CardContent>
      </Card>

      {/* Exercises */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5" />
              Ejercicios ({exercises.length})
            </CardTitle>
            <Button onClick={handleAddExercise}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Ejercicio
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {exercises.length > 0 ? (
            <div className="space-y-4">
              {exercises
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((exercise) => (
                  <Card key={exercise.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-lg mb-2">{exercise.exercise_name}</h4>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                            {exercise.sets && exercise.reps && (
                              <div>
                                <span className="text-muted-foreground">Series x Reps:</span>
                                <div className="font-medium">{exercise.sets} × {exercise.reps}</div>
                              </div>
                            )}
                            
                            {exercise.intensity && (
                              <div>
                                <span className="text-muted-foreground">Intensidad:</span>
                                <div>
                                  <Badge 
                                    variant="outline" 
                                    className={getIntensityColor(exercise.intensity)}
                                  >
                                    {exercise.intensity}
                                  </Badge>
                                </div>
                              </div>
                            )}
                            
                            {exercise.rest_seconds && (
                              <div>
                                <span className="text-muted-foreground">Descanso:</span>
                                <div className="font-medium">{exercise.rest_seconds}s</div>
                              </div>
                            )}
                            
                            {exercise.tempo && (
                              <div>
                                <span className="text-muted-foreground">Tempo:</span>
                                <div className="font-medium">{exercise.tempo}</div>
                              </div>
                            )}
                          </div>

                          {exercise.notes && (
                            <div className="mb-3">
                              <span className="text-sm text-muted-foreground italic">
                                💡 {exercise.notes}
                              </span>
                            </div>
                          )}

                          {(exercise.content_library_id || exercise.youtube_url) && (
                            <div className="mb-2">
                              <Badge variant="secondary" className="text-xs">
                                <Play className="w-3 h-3 mr-1" />
                                Video disponible
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditExercise(exercise)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay ejercicios asignados para este día</p>
              <Button 
                onClick={handleAddExercise}
                className="mt-4"
              >
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

export default TrainingDayEditor;
