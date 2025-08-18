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
  useTrainingPlan,
  useEnsureDraftTrainingPlan,
  useUpdateTrainingPlan,
  useAddOrUpdateDay,
  useAddOrUpdateExercise,
  useDeleteExercise,
  usePublishTrainingPlan
} from '@/hooks/api/use-training-plan';
import { useContentLibrary } from '@/hooks/api/use-content-library';
import { 
  Dumbbell, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  Eye, 
  Calendar,
  Clock,
  BarChart3,
  Play,
  X
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  full_name: string;
}

interface UserTrainingPlanEditorProps {
  user: User;
}

const DAYS_OF_WEEK = [
  { index: 0, name: 'Lunes', short: 'Lun' },
  { index: 1, name: 'Martes', short: 'Mar' },
  { index: 2, name: 'Miércoles', short: 'Mié' },
  { index: 3, name: 'Jueves', short: 'Jue' },
  { index: 4, name: 'Viernes', short: 'Vie' },
  { index: 5, name: 'Sábado', short: 'Sáb' },
  { index: 6, name: 'Domingo', short: 'Dom' },
];

const UserTrainingPlanEditor: React.FC<UserTrainingPlanEditorProps> = ({ user }) => {
  const { toast } = useToast();
  const [activeDay, setActiveDay] = React.useState<number | null>(null);
  const [showExerciseForm, setShowExerciseForm] = React.useState(false);
  const [editingExercise, setEditingExercise] = React.useState<any>(null);

  // Exercise form state
  const [exerciseName, setExerciseName] = React.useState('');
  const [contentLibraryId, setContentLibraryId] = React.useState<number | null>(null);
  const [youtubeUrl, setYoutubeUrl] = React.useState('');
  const [sets, setSets] = React.useState<number | null>(null);
  const [reps, setReps] = React.useState('');
  const [intensity, setIntensity] = React.useState('');
  const [restSeconds, setRestSeconds] = React.useState<number | null>(null);
  const [tempo, setTempo] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // API hooks
  const { data: trainingPlanData, isLoading } = useTrainingPlan(user.id);
  const { data: contentLibrary } = useContentLibrary('exercise');
  const ensureDraftMutation = useEnsureDraftTrainingPlan(user.id);
  const updatePlanMutation = useUpdateTrainingPlan(user.id);
  const addDayMutation = useAddOrUpdateDay(user.id);
  const addExerciseMutation = useAddOrUpdateExercise(user.id);
  const deleteExerciseMutation = useDeleteExercise(user.id);
  const publishPlanMutation = usePublishTrainingPlan(user.id);

  const plan = trainingPlanData?.plan;
  const days = trainingPlanData?.days || [];

  React.useEffect(() => {
    if (!plan && !isLoading) {
      // Ensure draft plan exists
      ensureDraftMutation.mutate();
    }
  }, [plan, isLoading, ensureDraftMutation]);

  const resetExerciseForm = () => {
    setExerciseName('');
    setContentLibraryId(null);
    setYoutubeUrl('');
    setSets(null);
    setReps('');
    setIntensity('');
    setRestSeconds(null);
    setTempo('');
    setNotes('');
    setEditingExercise(null);
  };

  const handleEditExercise = (exercise: any) => {
    setExerciseName(exercise.exercise_name);
    setContentLibraryId(exercise.content_library_id);
    setYoutubeUrl(exercise.youtube_url || '');
    setSets(exercise.sets);
    setReps(exercise.reps || '');
    setIntensity(exercise.intensity || '');
    setRestSeconds(exercise.rest_seconds);
    setTempo(exercise.tempo || '');
    setNotes(exercise.notes || '');
    setEditingExercise(exercise);
    setShowExerciseForm(true);
  };

  const handleAddDay = async (dayIndex: number) => {
    if (!plan) return;

    try {
      await addDayMutation.mutateAsync({
        planId: plan.id,
        day_index: dayIndex,
        title: DAYS_OF_WEEK[dayIndex].name,
        sort_order: dayIndex,
      });
      
      setActiveDay(dayIndex);
      toast({
        title: "Día agregado",
        description: `${DAYS_OF_WEEK[dayIndex].name} agregado al plan`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar el día",
        variant: "destructive",
      });
    }
  };

  const handleSaveExercise = async () => {
    if (!activeDay || !plan) return;

    if (!exerciseName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del ejercicio es requerido",
        variant: "destructive",
      });
      return;
    }

    const activeDay_obj = days.find(d => d.day_index === activeDay);
    if (!activeDay_obj) return;

    try {
      const exerciseData = {
        exercise_name: exerciseName.trim(),
        content_library_id: contentLibraryId,
        youtube_url: youtubeUrl.trim() || null,
        sets,
        reps: reps.trim() || null,
        intensity: intensity.trim() || null,
        rest_seconds: restSeconds,
        tempo: tempo.trim() || null,
        notes: notes.trim() || null,
        sort_order: editingExercise ? editingExercise.sort_order : (activeDay_obj.exercises?.length || 0),
      };

      if (editingExercise) {
        // Update existing exercise - we would need an update endpoint for this
        // For now, delete and recreate
        await deleteExerciseMutation.mutateAsync(editingExercise.id);
      }

      await addExerciseMutation.mutateAsync({
        dayId: activeDay_obj.id,
        exerciseData,
      });

      resetExerciseForm();
      setShowExerciseForm(false);
      
      toast({
        title: editingExercise ? "Ejercicio actualizado" : "Ejercicio agregado",
        description: `${exerciseName} ${editingExercise ? 'actualizado' : 'agregado'} correctamente`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el ejercicio",
        variant: "destructive",
      });
    }
  };

  const handleDeleteExercise = async (exercise: any) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${exercise.exercise_name}"?`)) {
      return;
    }

    try {
      await deleteExerciseMutation.mutateAsync(exercise.id);
      toast({
        title: "Ejercicio eliminado",
        description: `${exercise.exercise_name} eliminado del plan`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el ejercicio",
        variant: "destructive",
      });
    }
  };

  const handlePublishPlan = async () => {
    if (!plan) return;

    if (!confirm('¿Estás seguro de que quieres publicar este plan? Los usuarios podrán verlo inmediatamente.')) {
      return;
    }

    try {
      await publishPlanMutation.mutateAsync(plan.id);
      toast({
        title: "Plan publicado",
        description: "El plan de entrenamiento está ahora disponible para el usuario",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo publicar el plan",
        variant: "destructive",
      });
    }
  };

  const getDayData = (dayIndex: number) => {
    return days.find(d => d.day_index === dayIndex);
  };

  const formatRestTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
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
      {/* Plan Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5" />
                Plan de Entrenamiento para {user.full_name}
              </CardTitle>
              <CardDescription>
                Crea y edita el plan de entrenamiento semanal
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {plan && (
                <Badge variant={plan.status === 'published' ? 'default' : 'secondary'}>
                  {plan.status === 'published' ? 'Publicado' : 'Borrador'}
                </Badge>
              )}
              {plan && plan.status === 'draft' && (
                <Button 
                  onClick={handlePublishPlan}
                  disabled={publishPlanMutation.isPending}
                >
                  Publicar Plan
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Days Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Días de la Semana</CardTitle>
          <CardDescription>
            Haz clic en un día para agregar o editar ejercicios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const dayData = getDayData(day.index);
              const exerciseCount = dayData?.exercises?.length || 0;
              const isActive = activeDay === day.index;
              
              return (
                <Card 
                  key={day.index} 
                  className={`cursor-pointer transition-colors ${
                    isActive ? 'ring-2 ring-primary' : ''
                  } ${dayData ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}
                  onClick={() => {
                    if (dayData) {
                      setActiveDay(day.index);
                    } else {
                      handleAddDay(day.index);
                    }
                  }}
                >
                  <CardContent className="p-3 text-center">
                    <div className="text-sm font-medium">{day.short}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {dayData ? `${exerciseCount} ejercicio${exerciseCount !== 1 ? 's' : ''}` : 'Agregar día'}
                    </div>
                    {!dayData && (
                      <Plus className="w-4 h-4 mx-auto mt-1 text-muted-foreground" />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Details */}
      {activeDay !== null && getDayData(activeDay) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {DAYS_OF_WEEK[activeDay].name}
              </CardTitle>
              <Button
                onClick={() => {
                  resetExerciseForm();
                  setShowExerciseForm(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Ejercicio
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Exercise Form */}
            {showExerciseForm && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {editingExercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowExerciseForm(false);
                        resetExerciseForm();
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="exerciseName">Nombre del Ejercicio *</Label>
                      <Input
                        id="exerciseName"
                        value={exerciseName}
                        onChange={(e) => setExerciseName(e.target.value)}
                        placeholder="Ej: Push ups, Sentadillas"
                      />
                    </div>

                    <div>
                      <Label htmlFor="contentLibrary">Video de la Biblioteca</Label>
                      <Select value={contentLibraryId?.toString() || ''} onValueChange={(value) => setContentLibraryId(value ? parseInt(value) : null)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar video" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sin video</SelectItem>
                          {contentLibrary?.map((item) => (
                            <SelectItem key={item.id} value={item.id.toString()}>
                              {item.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="youtubeUrl">URL de YouTube (opcional)</Label>
                      <Input
                        id="youtubeUrl"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="intensity">Intensidad</Label>
                      <Select value={intensity} onValueChange={setIntensity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar intensidad" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sin especificar</SelectItem>
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="sets">Series</Label>
                      <Input
                        id="sets"
                        type="number"
                        value={sets || ''}
                        onChange={(e) => setSets(e.target.value ? parseInt(e.target.value) : null)}
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
                        placeholder="8-12, 30s, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="restSeconds">Descanso (seg)</Label>
                      <Input
                        id="restSeconds"
                        type="number"
                        value={restSeconds || ''}
                        onChange={(e) => setRestSeconds(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="60"
                        min="15"
                        max="300"
                      />
                    </div>

                    <div>
                      <Label htmlFor="tempo">Tempo</Label>
                      <Input
                        id="tempo"
                        value={tempo}
                        onChange={(e) => setTempo(e.target.value)}
                        placeholder="2-1-2-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Instrucciones adicionales, modificaciones, etc."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSaveExercise} disabled={addExerciseMutation.isPending}>
                      <Save className="w-4 h-4 mr-2" />
                      {addExerciseMutation.isPending ? 'Guardando...' : editingExercise ? 'Actualizar' : 'Agregar'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowExerciseForm(false);
                        resetExerciseForm();
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Exercise List */}
            <div className="space-y-3">
              {getDayData(activeDay)?.exercises?.map((exercise, index) => (
                <Card key={exercise.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{exercise.exercise_name}</h4>
                        {exercise.intensity && (
                          <Badge variant="outline" className="text-xs">
                            {exercise.intensity}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                        {exercise.sets && (
                          <div className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            {exercise.sets} series
                          </div>
                        )}
                        {exercise.reps && (
                          <div>Reps: {exercise.reps}</div>
                        )}
                        {exercise.rest_seconds && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRestTime(exercise.rest_seconds)}
                          </div>
                        )}
                        {exercise.tempo && (
                          <div>Tempo: {exercise.tempo}</div>
                        )}
                      </div>

                      {exercise.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          {exercise.notes}
                        </p>
                      )}

                      {(exercise.youtube_url || exercise.content_library_id) && (
                        <div className="flex items-center gap-2 mt-2">
                          <Play className="w-3 h-3 text-blue-600" />
                          <span className="text-xs text-blue-600">Video disponible</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditExercise(exercise)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteExercise(exercise)}
                        disabled={deleteExerciseMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )) || (
                <div className="text-center py-8 text-muted-foreground">
                  <Dumbbell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay ejercicios para este día</p>
                  <p className="text-sm">Haz clic en "Agregar Ejercicio" para comenzar</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeDay === null && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Selecciona un día para comenzar
            </h3>
            <p className="text-muted-foreground">
              Haz clic en un día de la semana para agregar ejercicios
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserTrainingPlanEditor;
