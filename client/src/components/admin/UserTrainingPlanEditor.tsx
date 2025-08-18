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
import { Plus, Play, Edit, Trash2, Save, Eye, Calendar, Dumbbell } from 'lucide-react';

interface User {
  id: number;
  full_name: string;
  email: string;
}

interface UserTrainingPlanEditorProps {
  user: User;
}

const UserTrainingPlanEditor: React.FC<UserTrainingPlanEditorProps> = ({ user }) => {
  const { toast } = useToast();
  const [selectedDayIndex, setSelectedDayIndex] = React.useState<number | null>(null);
  const [editingExercise, setEditingExercise] = React.useState<any>(null);
  const [showExerciseForm, setShowExerciseForm] = React.useState(false);

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

  const handleCreateDraft = async () => {
    try {
      await ensureDraftMutation.mutateAsync();
      toast({
        title: "Plan creado",
        description: "Se ha creado un nuevo plan de entrenamiento",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el plan",
        variant: "destructive",
      });
    }
  };

  const handleAddDay = async (dayIndex: number) => {
    if (!plan) return;

    try {
      await addDayMutation.mutateAsync({
        planId: plan.id,
        day_index: dayIndex,
        title: `Día ${dayIndex}`,
        sort_order: dayIndex
      });
      
      toast({
        title: "Día agregado",
        description: `Día ${dayIndex} agregado al plan`,
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

  const handleSaveExercise = async () => {
    if (!exerciseName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del ejercicio es requerido",
        variant: "destructive",
      });
      return;
    }

    const selectedDay = days.find(d => d.day_index === selectedDayIndex);
    if (!selectedDay) return;

    try {
      await addExerciseMutation.mutateAsync({
        dayId: selectedDay.id,
        exerciseData: {
          id: editingExercise?.id,
          exercise_name: exerciseName.trim(),
          content_library_id: contentLibraryId,
          youtube_url: youtubeUrl.trim() || null,
          sets,
          reps: reps.trim() || null,
          intensity: intensity || null,
          rest_seconds: restSeconds,
          tempo: tempo.trim() || null,
          notes: notes.trim() || null,
          sort_order: editingExercise?.sort_order || 0
        }
      });

      toast({
        title: editingExercise ? "Ejercicio actualizado" : "Ejercicio agregado",
        description: "El ejercicio se ha guardado correctamente",
        variant: "default",
      });

      resetExerciseForm();
      setShowExerciseForm(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el ejercicio",
        variant: "destructive",
      });
    }
  };

  const handleDeleteExercise = async (exerciseId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este ejercicio?')) {
      return;
    }

    try {
      await deleteExerciseMutation.mutateAsync(exerciseId);
      toast({
        title: "Ejercicio eliminado",
        description: "El ejercicio se ha eliminado del plan",
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

    if (!confirm('¿Estás seguro de que quieres publicar este plan? Los usuarios verán esta versión.')) {
      return;
    }

    try {
      await publishPlanMutation.mutateAsync(plan.id);
      toast({
        title: "Plan publicado",
        description: "El plan de entrenamiento ha sido publicado para el usuario",
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

  const getDayName = (dayIndex: number) => {
    const dayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return dayNames[dayIndex] || `Día ${dayIndex}`;
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'baja':
        return 'bg-green-100 text-green-800';
      case 'media':
        return 'bg-yellow-100 text-yellow-800';
      case 'alta':
        return 'bg-red-100 text-red-800';
      default:
        if (intensity?.startsWith('RPE')) {
          return 'bg-blue-100 text-blue-800';
        }
        return 'bg-gray-100 text-gray-800';
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Plan de Entrenamiento</h3>
          <p className="text-sm text-muted-foreground">
            Plan para {user.full_name}
          </p>
        </div>
        
        {!plan ? (
          <Button onClick={handleCreateDraft}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Plan
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant={plan.status === 'published' ? 'default' : 'secondary'}>
              {plan.status === 'published' ? 'Publicado' : 'Borrador'}
            </Badge>
            <Button
              onClick={handlePublishPlan}
              disabled={plan.status === 'published' || publishPlanMutation.isPending}
            >
              {plan.status === 'published' ? 'Publicado' : 'Publicar Plan'}
            </Button>
          </div>
        )}
      </div>

      {plan ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Days List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Días del Plan</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const nextDayIndex = Math.max(...days.map(d => d.day_index), 0) + 1;
                  handleAddDay(nextDayIndex);
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7].map(dayIndex => {
                const day = days.find(d => d.day_index === dayIndex);
                const isSelected = selectedDayIndex === dayIndex;

                return (
                  <Card 
                    key={dayIndex} 
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedDayIndex(dayIndex)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium">{getDayName(dayIndex)}</h5>
                          <p className="text-sm text-muted-foreground">
                            {day ? `${day.exercises?.length || 0} ejercicios` : 'Sin ejercicios'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {day && (
                            <Badge variant="outline">
                              {day.exercises?.length || 0}
                            </Badge>
                          )}
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Day Content */}
          <div className="lg:col-span-2 space-y-6">
            {selectedDayIndex ? (
              <>
                {/* Day Header */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Dumbbell className="w-5 h-5" />
                      {getDayName(selectedDayIndex)}
                    </CardTitle>
                    <CardDescription>
                      Ejercicios para este día
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {days.find(d => d.day_index === selectedDayIndex)?.exercises?.length || 0} ejercicios configurados
                      </div>
                      <Button
                        onClick={() => {
                          if (!days.find(d => d.day_index === selectedDayIndex)) {
                            handleAddDay(selectedDayIndex);
                          }
                          resetExerciseForm();
                          setShowExerciseForm(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Ejercicio
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Exercise Form */}
                {showExerciseForm && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>
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
                          Cancelar
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="exerciseName">Nombre del Ejercicio *</Label>
                            <Input
                              id="exerciseName"
                              value={exerciseName}
                              onChange={(e) => setExerciseName(e.target.value)}
                              placeholder="Ej: Push ups, Sentadillas..."
                            />
                          </div>

                          <div>
                            <Label>Video de la Biblioteca</Label>
                            <Select 
                              value={contentLibraryId?.toString() || ''} 
                              onValueChange={(value) => setContentLibraryId(value ? parseInt(value) : null)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar video" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Sin video</SelectItem>
                                {contentLibrary?.map(item => (
                                  <SelectItem key={item.id} value={item.id.toString()}>
                                    {item.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="youtubeUrl">URL de YouTube (Alternativa)</Label>
                          <Input
                            id="youtubeUrl"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                          />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label htmlFor="sets">Series</Label>
                            <Input
                              id="sets"
                              type="number"
                              value={sets || ''}
                              onChange={(e) => setSets(e.target.value ? parseInt(e.target.value) : null)}
                              min={1}
                              max={10}
                            />
                          </div>

                          <div>
                            <Label htmlFor="reps">Repeticiones</Label>
                            <Input
                              id="reps"
                              value={reps}
                              onChange={(e) => setReps(e.target.value)}
                              placeholder="8-12, AMRAP, etc."
                            />
                          </div>

                          <div>
                            <Label>Intensidad</Label>
                            <Select value={intensity} onValueChange={setIntensity}>
                              <SelectTrigger>
                                <SelectValue placeholder="Intensidad" />
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

                          <div>
                            <Label htmlFor="rest">Descanso (seg)</Label>
                            <Input
                              id="rest"
                              type="number"
                              value={restSeconds || ''}
                              onChange={(e) => setRestSeconds(e.target.value ? parseInt(e.target.value) : null)}
                              min={0}
                              max={600}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="tempo">Tempo</Label>
                            <Input
                              id="tempo"
                              value={tempo}
                              onChange={(e) => setTempo(e.target.value)}
                              placeholder="Ej: 3-1-1-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="notes">Notas</Label>
                            <Input
                              id="notes"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Instrucciones adicionales"
                            />
                          </div>
                        </div>

                        <Button onClick={handleSaveExercise} disabled={addExerciseMutation.isPending}>
                          <Save className="w-4 h-4 mr-2" />
                          {addExerciseMutation.isPending ? 'Guardando...' : 'Guardar Ejercicio'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Exercises List */}
                {selectedDayIndex && days.find(d => d.day_index === selectedDayIndex) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Ejercicios</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const selectedDay = days.find(d => d.day_index === selectedDayIndex);
                        const exercises = selectedDay?.exercises || [];

                        if (exercises.length === 0) {
                          return (
                            <div className="text-center py-8">
                              <Dumbbell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-muted-foreground">
                                No hay ejercicios configurados para este día
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-4">
                            {exercises.map((exercise, index) => (
                              <Card key={exercise.id} className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h5 className="font-medium">{exercise.exercise_name}</h5>
                                      {exercise.intensity && (
                                        <Badge className={getIntensityColor(exercise.intensity)}>
                                          {exercise.intensity}
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground mb-2">
                                      {exercise.sets && (
                                        <span>Series: {exercise.sets}</span>
                                      )}
                                      {exercise.reps && (
                                        <span>Reps: {exercise.reps}</span>
                                      )}
                                      {exercise.rest_seconds && (
                                        <span>Descanso: {exercise.rest_seconds}s</span>
                                      )}
                                      {exercise.tempo && (
                                        <span>Tempo: {exercise.tempo}</span>
                                      )}
                                    </div>

                                    {exercise.notes && (
                                      <p className="text-sm text-muted-foreground italic">
                                        {exercise.notes}
                                      </p>
                                    )}

                                    {(exercise.content_video_url || exercise.youtube_url) && (
                                      <div className="mt-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => window.open(exercise.content_video_url || exercise.youtube_url, '_blank')}
                                        >
                                          <Play className="w-3 h-3 mr-1" />
                                          Ver Video
                                        </Button>
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
                                      onClick={() => handleDeleteExercise(exercise.id)}
                                      disabled={deleteExerciseMutation.isPending}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    Selecciona un día
                  </h3>
                  <p className="text-muted-foreground">
                    Elige un día de la semana para agregar ejercicios
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Dumbbell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Sin Plan de Entrenamiento
            </h3>
            <p className="text-muted-foreground mb-4">
              Este usuario no tiene un plan de entrenamiento asignado
            </p>
            <Button onClick={handleCreateDraft}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Plan de Entrenamiento
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserTrainingPlanEditor;
