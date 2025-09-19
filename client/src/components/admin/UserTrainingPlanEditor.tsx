import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUserTrainingSchedule, useCreateTrainingSchedule } from '@/hooks/api/use-training-schedule';
import { useContentLibrary } from '@/hooks/api/use-content-library';
import { Dumbbell, Save, Plus, Trash2, Play } from 'lucide-react';

interface User {
  id: number;
  email: string;
  full_name: string;
}

interface UserTrainingPlanEditorProps {
  user: User;
}

interface ExerciseRow {
  id?: number | string;
  exercise_name: string;
  content_library_id: number | string | null;
  video_url: string;
  sets: number | null;
  reps: string;
  rest_seconds: number | null;
  intensity: string;
  notes: string;
}

const UserTrainingPlanEditor: React.FC<UserTrainingPlanEditorProps> = ({ user }) => {
  const { toast } = useToast();
  const [planTitle, setPlanTitle] = React.useState('');
  const [exercisesByDay, setExercisesByDay] = React.useState<Record<string, ExerciseRow[]>>({});
  
  const { data: scheduleData, isLoading } = useUserTrainingSchedule(user.id);
  const { data: contentLibrary } = useContentLibrary('exercise');
  const createScheduleMutation = useCreateTrainingSchedule();

  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const intensityOptions = ['Baja', 'Media', 'Alta', 'RPE6', 'RPE7', 'RPE8', 'RPE9', 'RPE10'];

  // Initialize form with existing data
  React.useEffect(() => {
    if (scheduleData?.schedule && scheduleData?.exercises) {
      setPlanTitle(scheduleData.schedule.plan_title || '');
      
      const formattedExercises: Record<string, ExerciseRow[]> = {};
      
      daysOfWeek.forEach(day => {
        const dayExercises = scheduleData.exercises[day] || [];
        formattedExercises[day] = dayExercises.map(exercise => ({
          id: exercise.id,
          exercise_name: exercise.exercise_name,
          content_library_id: exercise.content_library_id,
          video_url: exercise.video_url || '',
          sets: exercise.sets,
          reps: exercise.reps || '',
          rest_seconds: exercise.rest_seconds,
          intensity: exercise.intensity || '',
          notes: exercise.notes || ''
        }));
      });
      
      setExercisesByDay(formattedExercises);
    } else {
      // Initialize empty structure
      const emptyStructure: Record<string, ExerciseRow[]> = {};
      daysOfWeek.forEach(day => {
        emptyStructure[day] = [];
      });
      setExercisesByDay(emptyStructure);
    }
  }, [scheduleData]);

  const addExerciseToDay = (dayName: string) => {
    setExercisesByDay(prev => ({
      ...prev,
      [dayName]: [
        ...(prev[dayName] || []),
        {
          exercise_name: '',
          content_library_id: null,
          video_url: '',
          sets: null,
          reps: '',
          rest_seconds: null,
          intensity: '',
          notes: ''
        }
      ]
    }));
  };

  const removeExerciseFromDay = (dayName: string, exerciseIndex: number) => {
    setExercisesByDay(prev => ({
      ...prev,
      [dayName]: prev[dayName]?.filter((_, index) => index !== exerciseIndex) || []
    }));
  };

  const updateExercise = (dayName: string, exerciseIndex: number, field: keyof ExerciseRow, value: any) => {
    setExercisesByDay(prev => ({
      ...prev,
      [dayName]: prev[dayName]?.map((exercise, index) => 
        index === exerciseIndex 
          ? { ...exercise, [field]: value }
          : exercise
      ) || []
    }));
  };

  const handleContentLibrarySelect = (dayName: string, exerciseIndex: number, contentId: string) => {
    if (contentId === 'custom') {
      updateExercise(dayName, exerciseIndex, 'content_library_id', null);
      updateExercise(dayName, exerciseIndex, 'video_url', '');
      return;
    }

    const contentItem = contentLibrary?.find(item => item.id === parseInt(contentId));
    if (contentItem) {
      updateExercise(dayName, exerciseIndex, 'content_library_id', contentItem.id);
      updateExercise(dayName, exerciseIndex, 'exercise_name', contentItem.title);
      updateExercise(dayName, exerciseIndex, 'video_url', contentItem.video_url || '');
    }
  };

  const handleSavePlan = async () => {
    if (!planTitle.trim()) {
      toast({
        title: "Error",
        description: "El título del plan es requerido",
        variant: "destructive",
      });
      return;
    }

    try {
      await createScheduleMutation.mutateAsync({
        userId: user.id,
        plan_title: planTitle,
        exercises_by_day: exercisesByDay
      });

      toast({
        title: "Plan guardado",
        description: "El plan de entrenamiento se ha guardado correctamente",
        variant: "default",
      });
    } catch (error) {
      console.error('Error saving training plan:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el plan de entrenamiento",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-sm text-muted-foreground">Cargando plan de entrenamiento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5" />
            Plan de Entrenamiento para {user.full_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Title */}
          <div className="space-y-2">
            <Label htmlFor="planTitle">Título del Plan</Label>
            <Input
              id="planTitle"
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
              placeholder="Ej: Plan de Fuerza Básica - Semana 1"
              className="max-w-md"
            />
          </div>

          {/* Days Schedule */}
          {daysOfWeek.map(dayName => {
            const dayExercises = exercisesByDay[dayName] || [];
            
            return (
              <Card key={dayName} className="border-2">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{dayName}</CardTitle>
                    <Button
                      size="sm"
                      onClick={() => addExerciseToDay(dayName)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Ejercicio
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {dayExercises.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Día de descanso - No hay ejercicios programados</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dayExercises.map((exercise, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-4">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium">Ejercicio {index + 1}</h4>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeExerciseFromDay(dayName, index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Exercise Selection */}
                            <div className="space-y-2">
                              <Label>Ejercicio</Label>
                              <Select
                                value={exercise.content_library_id?.toString() || 'custom'}
                                onValueChange={(value) => handleContentLibrarySelect(dayName, index, value)}
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
                                onChange={(e) => updateExercise(dayName, index, 'exercise_name', e.target.value)}
                                placeholder="Nombre del ejercicio"
                              />
                            </div>

                            {/* Sets */}
                            <div className="space-y-2">
                              <Label>Series</Label>
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                value={exercise.sets || ''}
                                onChange={(e) => updateExercise(dayName, index, 'sets', parseInt(e.target.value) || null)}
                                placeholder="3"
                              />
                            </div>

                            {/* Reps */}
                            <div className="space-y-2">
                              <Label>Repeticiones</Label>
                              <Input
                                value={exercise.reps}
                                onChange={(e) => updateExercise(dayName, index, 'reps', e.target.value)}
                                placeholder="10-12"
                              />
                            </div>

                            {/* Rest */}
                            <div className="space-y-2">
                              <Label>Descanso (segundos)</Label>
                              <Input
                                type="number"
                                min="0"
                                max="300"
                                step="15"
                                value={exercise.rest_seconds || ''}
                                onChange={(e) => updateExercise(dayName, index, 'rest_seconds', parseInt(e.target.value) || null)}
                                placeholder="60"
                              />
                            </div>

                            {/* Intensity */}
                            <div className="space-y-2">
                              <Label>Intensidad</Label>
                              <Select
                                value={exercise.intensity}
                                onValueChange={(value) => updateExercise(dayName, index, 'intensity', value)}
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

                            {/* Video URL */}
                            <div className="space-y-2 md:col-span-2">
                              <Label>URL del Video (opcional)</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={exercise.video_url}
                                  onChange={(e) => updateExercise(dayName, index, 'video_url', e.target.value)}
                                  placeholder="https://www.youtube.com/watch?v=..."
                                />
                                {exercise.video_url && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(exercise.video_url, '_blank')}
                                  >
                                    <Play className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2 md:col-span-2">
                              <Label>Notas</Label>
                              <Textarea
                                value={exercise.notes}
                                onChange={(e) => updateExercise(dayName, index, 'notes', e.target.value)}
                                placeholder="Notas adicionales sobre el ejercicio..."
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Save Button */}
          <div className="flex items-center gap-4 pt-4">
            <Button 
              onClick={handleSavePlan}
              disabled={createScheduleMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {createScheduleMutation.isPending ? 'Guardando...' : 'Guardar Plan'}
            </Button>
            
            {scheduleData?.schedule && (
              <div className="text-sm text-muted-foreground">
                Última actualización: {new Date(scheduleData.schedule.updated_at).toLocaleString()}
              </div>
            )}
          </div>

          {/* Information */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">ℹ️ Información</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• El plan se actualizará automáticamente para el usuario</p>
              <p>• Los ejercicios de la biblioteca incluyen videos demostrativos</p>
              <p>• Puedes agregar ejercicios personalizados con URLs de video propias</p>
              <p>• Los cambios son visibles inmediatamente en la vista del usuario</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserTrainingPlanEditor;
