import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dumbbell, FileText, Eye, CheckCircle, Play, Clock, Target, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTodayHabits, useUpdateHabit } from '@/hooks/api/use-daily-habits';
import { useTrainingPlan } from '@/hooks/api/use-training-plan';
import PDFViewer from '@/components/PDFViewer';

const TrainingPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPDFViewer, setShowPDFViewer] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<any>(null);
  const [selectedDay, setSelectedDay] = React.useState<number>(1);
  
  // Check if user has access to training features
  const hasTrainingAccess = user?.features?.training || false;
  
  // Fetch user's training plan
  const { data: trainingData, isLoading: planLoading } = useTrainingPlan(user?.id || 0);
  
  // Daily habits for completion tracking
  const { data: todayHabits } = useTodayHabits();
  const updateHabitMutation = useUpdateHabit();

  const handleCompleteTraining = async () => {
    try {
      await updateHabitMutation.mutateAsync({
        date: new Date().toISOString().split('T')[0],
        training_completed: !todayHabits?.training_completed
      });
      
      toast({
        title: todayHabits?.training_completed ? "Entrenamiento marcado como no completado" : "¡Entrenamiento completado!",
        description: todayHabits?.training_completed ? 
          "Has desmarcado el entrenamiento de hoy" : 
          "¡Excelente! Has completado tu entrenamiento hoy.",
        variant: "success",
      });
    } catch (error) {
      console.error('Error updating training completion:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del entrenamiento",
        variant: "destructive",
      });
    }
  };

  const handleViewPlan = (file: any) => {
    setSelectedFile(file);
    setShowPDFViewer(true);
  };

  const handleVideoClick = (exercise: any) => {
    if (exercise.content_video_url) {
      window.open(exercise.content_video_url, '_blank');
    } else if (exercise.youtube_url) {
      window.open(exercise.youtube_url, '_blank');
    }
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'baja':
        return 'bg-green-100 text-green-800';
      case 'media':
        return 'bg-yellow-100 text-yellow-800';
      case 'alta':
        return 'bg-red-100 text-red-800';
      case 'RPE6':
      case 'RPE7':
        return 'bg-blue-100 text-blue-800';
      case 'RPE8':
      case 'RPE9':
        return 'bg-orange-100 text-orange-800';
      case 'RPE10':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!hasTrainingAccess) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Dumbbell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-600 mb-4">Acceso a Entrenamiento No Disponible</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            La función de entrenamiento no está incluida en tu plan actual. 
            Actualiza tu plan para acceder a esta funcionalidad.
          </p>
          <Button 
            onClick={() => window.location.href = '/plans'}
            className="bg-[#D3B869] hover:bg-[#D3B869]/90 text-black"
          >
            Ver Planes Disponibles
          </Button>
        </div>
      </div>
    );
  }

  if (planLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando tu plan de entrenamiento...</p>
        </div>
      </div>
    );
  }

  if (showPDFViewer && selectedFile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setShowPDFViewer(false)}
            className="mb-4"
          >
            ← Volver al Plan
          </Button>
        </div>
        <PDFViewer 
          fileId={selectedFile.id}
          filename={selectedFile.filename}
          onClose={() => setShowPDFViewer(false)}
        />
      </div>
    );
  }

  const trainingPlan = trainingData?.plan;
  const planDays = trainingData?.days || [];
  const legacyPdf = trainingData?.legacyPdf;
  const hasStructuredPlan = trainingPlan && planDays.length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Dumbbell className="w-8 h-8 text-[#D3B869]" />
            <div>
              <h1 className="text-3xl font-bold">Entrenamiento</h1>
              <p className="text-muted-foreground">Tu plan de entrenamiento personalizado</p>
            </div>
          </div>
          
          {/* Completion Toggle */}
          <Button
            onClick={handleCompleteTraining}
            variant={todayHabits?.training_completed ? "default" : "outline"}
            className={
              todayHabits?.training_completed
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "border-[#D3B869] text-[#D3B869] hover:bg-[#D3B869] hover:text-black"
            }
            disabled={updateHabitMutation.isPending}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {todayHabits?.training_completed ? "Completado Hoy" : "Marcar Completado"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {hasStructuredPlan ? (
        <div className="space-y-6">
          {/* Plan Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {trainingPlan.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">
                    {trainingPlan.status === 'published' ? 'Activo' : 'Borrador'}
                  </Badge>
                  <Badge variant="outline">v{trainingPlan.version}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#D3B869]">{planDays.length}</div>
                  <div className="text-sm text-muted-foreground">Días</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#D3B869]">
                    {planDays.reduce((sum, day) => sum + (day.exercises?.length || 0), 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Ejercicios</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#D3B869]">
                    {planDays.filter(day => day.exercises && day.exercises.length > 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Días activos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#D3B869]">
                    v{trainingPlan.version}
                  </div>
                  <div className="text-sm text-muted-foreground">Versión</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Day Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Día</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }, (_, i) => i + 1).map((dayNum) => {
                  const dayData = planDays.find(d => d.day_index === dayNum);
                  const exerciseCount = dayData?.exercises?.length || 0;
                  
                  return (
                    <Button
                      key={dayNum}
                      variant={selectedDay === dayNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedDay(dayNum)}
                      className="flex flex-col h-auto py-3"
                      disabled={exerciseCount === 0}
                    >
                      <span className="font-medium">Día {dayNum}</span>
                      <span className="text-xs opacity-70">
                        {exerciseCount} ej.
                      </span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Day Exercises */}
          {(() => {
            const selectedDayData = planDays.find(d => d.day_index === selectedDay);
            if (!selectedDayData || !selectedDayData.exercises || selectedDayData.exercises.length === 0) {
              return (
                <Card>
                  <CardContent className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">
                      Sin ejercicios para el Día {selectedDay}
                    </h3>
                    <p className="text-muted-foreground">
                      No hay ejercicios programados para este día.
                    </p>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="w-5 h-5" />
                    {selectedDayData.title || `Día ${selectedDay}`}
                  </CardTitle>
                  {selectedDayData.notes && (
                    <CardDescription>{selectedDayData.notes}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedDayData.exercises.map((exercise: any, index: number) => (
                      <Card key={exercise.id} className="border-l-4 border-l-[#D3B869]">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-lg font-medium mb-2">{exercise.exercise_name}</h4>
                              
                              {/* Exercise Parameters */}
                              <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                                {exercise.sets && (
                                  <div className="flex items-center gap-1">
                                    <Target className="w-4 h-4" />
                                    <span>{exercise.sets} series</span>
                                  </div>
                                )}
                                {exercise.reps && (
                                  <div className="flex items-center gap-1">
                                    <span>{exercise.reps} reps</span>
                                  </div>
                                )}
                                {exercise.rest_seconds && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{exercise.rest_seconds}s descanso</span>
                                  </div>
                                )}
                              </div>

                              {/* Intensity Badge */}
                              {exercise.intensity && (
                                <div className="mb-3">
                                  <Badge className={getIntensityColor(exercise.intensity)}>
                                    {exercise.intensity}
                                  </Badge>
                                </div>
                              )}

                              {/* Tempo */}
                              {exercise.tempo && (
                                <div className="mb-3 text-sm">
                                  <span className="text-muted-foreground">Tempo: </span>
                                  <span className="font-mono">{exercise.tempo}</span>
                                </div>
                              )}

                              {/* Notes */}
                              {exercise.notes && (
                                <p className="text-sm text-muted-foreground mb-3">{exercise.notes}</p>
                              )}
                            </div>

                            {/* Video Button */}
                            {(exercise.content_video_url || exercise.youtube_url) && (
                              <Button
                                onClick={() => handleVideoClick(exercise)}
                                size="sm"
                                className="ml-4 bg-red-600 hover:bg-red-700"
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Ver Video
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      ) : legacyPdf ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Mi Plan de Entrenamiento (PDF)
            </CardTitle>
            <CardDescription>
              Plan en formato PDF subido por tu entrenador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <FileText className="w-12 h-12 text-red-600" />
              <div className="flex-1">
                <h3 className="font-medium">{legacyPdf.filename}</h3>
                <p className="text-sm text-muted-foreground">
                  Subido el {new Date(legacyPdf.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button 
                onClick={() => handleViewPlan(legacyPdf)}
                className="bg-[#D3B869] hover:bg-[#D3B869]/90 text-black"
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Dumbbell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              No hay plan de entrenamiento disponible
            </h3>
            <p className="text-muted-foreground mb-6">
              Tu entrenador aún no ha creado tu plan de entrenamiento personalizado.
            </p>
            <div className="text-sm text-muted-foreground">
              <p>Mientras tanto, puedes:</p>
              <ul className="mt-2 space-y-1">
                <li>• Explorar ejercicios en la sección de Ejercicios</li>
                <li>• Realizar pausas activas</li>
                <li>• Contactar a tu entrenador si tienes dudas</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training Tips */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">💪 Consejos de Entrenamiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Calentamiento</h4>
              <p className="text-muted-foreground">
                Siempre realiza 5-10 minutos de calentamiento antes de empezar tu entrenamiento.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Técnica</h4>
              <p className="text-muted-foreground">
                Concéntrate en la forma correcta antes que en el peso. La técnica es fundamental.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Descanso</h4>
              <p className="text-muted-foreground">
                Respeta los tiempos de descanso entre series para mantener la intensidad.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Progresión</h4>
              <p className="text-muted-foreground">
                Aumenta gradualmente la intensidad y el volumen semana a semana.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainingPage;
