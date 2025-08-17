import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, FileText, Eye, CheckCircle, Play, ExternalLink, Clock, Zap } from 'lucide-react';
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
          "¡Excelente! Has completado tu entrenamiento de hoy.",
        variant: "default",
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

  const handleOpenVideo = (url: string) => {
    window.open(url, '_blank');
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

  const plan = trainingData?.plan;
  const days = trainingData?.days || [];
  const legacyPdf = trainingData?.legacyPdf;
  const hasStructuredPlan = plan && days.length > 0;

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
          {/* Plan Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {plan.title || 'Plan de Entrenamiento'}
                  </CardTitle>
                  <CardDescription>
                    Plan personalizado - Versión {plan.version} • {plan.status === 'published' ? 'Publicado' : 'Borrador'}
                  </CardDescription>
                </div>
                <Badge variant={plan.status === 'published' ? 'default' : 'secondary'}>
                  {plan.status === 'published' ? 'Activo' : 'Borrador'}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Training Days */}
          <div className="grid gap-6">
            {days
              .sort((a, b) => a.day_index - b.day_index)
              .map((day) => (
                <Card key={day.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {day.title || `Día ${day.day_index}`}
                    </CardTitle>
                    {day.notes && (
                      <CardDescription>{day.notes}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {day.exercises.length > 0 ? (
                      <div className="space-y-4">
                        {day.exercises
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map((exercise) => (
                            <Card key={exercise.id} className="border-l-4 border-l-[#D3B869]">
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-lg mb-2">{exercise.exercise_name}</h4>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                                      {exercise.sets && exercise.reps && (
                                        <div className="flex items-center gap-2">
                                          <Dumbbell className="w-4 h-4 text-muted-foreground" />
                                          <span>{exercise.sets} × {exercise.reps}</span>
                                        </div>
                                      )}
                                      
                                      {exercise.intensity && (
                                        <div className="flex items-center gap-2">
                                          <Zap className="w-4 h-4 text-muted-foreground" />
                                          <Badge 
                                            variant="outline" 
                                            className={getIntensityColor(exercise.intensity)}
                                          >
                                            {exercise.intensity}
                                          </Badge>
                                        </div>
                                      )}
                                      
                                      {exercise.rest_seconds && (
                                        <div className="flex items-center gap-2">
                                          <Clock className="w-4 h-4 text-muted-foreground" />
                                          <span>{exercise.rest_seconds}s descanso</span>
                                        </div>
                                      )}
                                      
                                      {exercise.tempo && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium">TEMPO:</span>
                                          <span className="text-xs">{exercise.tempo}</span>
                                        </div>
                                      )}
                                    </div>

                                    {exercise.notes && (
                                      <div className="mb-3">
                                        <p className="text-sm text-muted-foreground italic">
                                          💡 {exercise.notes}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Video Button */}
                                  {(exercise.content_library_id || exercise.youtube_url) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const url = exercise.content_video_url || exercise.youtube_url;
                                        if (url) handleOpenVideo(url);
                                      }}
                                      className="ml-4"
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
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No hay ejercicios asignados para este día</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
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
                <li>• Realizar actividades de calentamiento general</li>
                <li>• Mantener tu rutina de ejercicio básico</li>
                <li>• Contactar a tu entrenador si tienes dudas</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">💪 Tips de Entrenamiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Antes del Entrenamiento</h4>
              <p className="text-muted-foreground">
                Realiza un calentamiento de 5-10 minutos y asegúrate de estar bien hidratado.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Durante el Entrenamiento</h4>
              <p className="text-muted-foreground">
                Mantén la técnica correcta, respeta los tiempos de descanso y escucha a tu cuerpo.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Después del Entrenamiento</h4>
              <p className="text-muted-foreground">
                Realiza estiramientos, hidrátate adecuadamente y permite que tu cuerpo se recupere.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Progresión</h4>
              <p className="text-muted-foreground">
                Aumenta gradualmente la intensidad y siempre consulta con tu entrenador sobre cambios.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Calendar component for day display - fixed import
const Calendar = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    height="24"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect height="18" rx="2" ry="2" width="18" x="3" y="4" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

export default TrainingPage;
