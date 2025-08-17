import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dumbbell, FileText, Eye, CheckCircle, PlayCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserFiles } from '@/hooks/api/use-user-files';
import { useTodayHabits, useUpdateHabit } from '@/hooks/api/use-daily-habits';
import { useContentVideosByCategory } from '@/hooks/api/use-content-videos';
import PDFViewer from '@/components/PDFViewer';

const TrainingPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPDFViewer, setShowPDFViewer] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<any>(null);
  
  // Check if user has access to training features
  const hasTrainingAccess = user?.features?.training || false;
  
  // Fetch user's training files
  const { data: userFiles, isLoading: filesLoading } = useUserFiles('training');
  
  // Daily habits for completion tracking
  const { data: todayHabits } = useTodayHabits();
  const updateHabitMutation = useUpdateHabit();
  
  // Fetch exercise videos
  const { data: exerciseVideos, isLoading: videosLoading } = useContentVideosByCategory('exercise');

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
          "¡Excelente! Has completado tu sesión de entrenamiento.",
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

  const handleOpenVideo = (videoUrl: string) => {
    window.open(videoUrl, '_blank');
  };

  if (!hasTrainingAccess) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Dumbbell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-600 mb-4">Acceso a Entrenamiento</h2>
          <p className="text-muted-foreground mb-6">
            Tu plan actual no incluye acceso a la sección de entrenamiento.
          </p>
          <p className="text-sm text-muted-foreground">
            Contacta al administrador para actualizar tu plan y acceder a esta funcionalidad.
          </p>
        </div>
      </div>
    );
  }

  if (showPDFViewer && selectedFile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PDFViewer
          fileId={selectedFile.id}
          filename={selectedFile.filename}
          onClose={() => {
            setShowPDFViewer(false);
            setSelectedFile(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Entrenamiento</h1>
        <p className="text-muted-foreground">
          Accede a tu plan de entrenamiento personalizado y videos de ejercicios
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Training Completion Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5" />
              Entrenamiento de Hoy
            </CardTitle>
            <CardDescription>
              Marca cuando hayas completado tu sesión de entrenamiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
                  todayHabits?.training_completed ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {todayHabits?.training_completed ? (
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  ) : (
                    <Dumbbell className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <p className="font-medium mb-2">
                  {todayHabits?.training_completed ? '¡Entrenamiento completado!' : 'Entrenamiento pendiente'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {todayHabits?.training_completed ? 
                    'Has completado tu sesión de entrenamiento de hoy' : 
                    'Completa tu rutina de entrenamiento para mantenerte en forma'}
                </p>
              </div>
              
              <Button 
                onClick={handleCompleteTraining}
                className="w-full"
                variant={todayHabits?.training_completed ? "outline" : "default"}
                disabled={updateHabitMutation.isPending}
              >
                {updateHabitMutation.isPending 
                  ? 'Actualizando...' 
                  : todayHabits?.training_completed 
                    ? 'Marcar como no completado' 
                    : 'Marcar como completado'
                }
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Training Plan Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Mi Plan de Entrenamiento
            </CardTitle>
            <CardDescription>
              Accede a tu plan de entrenamiento personalizado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Cargando plan de entrenamiento...</p>
              </div>
            ) : userFiles && userFiles.length > 0 ? (
              <div className="space-y-3">
                {userFiles.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="font-medium">{file.filename}</p>
                        <p className="text-sm text-muted-foreground">
                          Plan de Entrenamiento • {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewPlan(file)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Plan
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No tienes planes asignados</h3>
                <p className="text-muted-foreground">
                  Tu plan de entrenamiento personalizado aparecerá aquí una vez que sea asignado por el administrador.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Exercise Videos Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5" />
            Videos de Entrenamiento
          </CardTitle>
          <CardDescription>
            Explora nuestra biblioteca de videos de ejercicios y rutinas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {videosLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Cargando videos...</p>
            </div>
          ) : exerciseVideos && exerciseVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exerciseVideos.map(video => (
                <div key={video.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    <PlayCircle className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-lg mb-1 line-clamp-2">{video.title}</h3>
                      {video.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {video.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleOpenVideo(video.video_url)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver Video
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <PlayCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No hay videos disponibles</h3>
              <p className="text-muted-foreground">
                Los videos de entrenamiento aparecerán aquí una vez que sean agregados por el administrador.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainingPage;