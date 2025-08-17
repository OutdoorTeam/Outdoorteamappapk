import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dumbbell, Play, ExternalLink, FileText, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useContentLibrary } from '@/hooks/api/use-content-library';
import { useUserFiles } from '@/hooks/api/use-user-files';
import { useDailyHabits } from '@/hooks/api/use-daily-habits';
import { useWorkoutOfDay } from '@/hooks/api/use-workout';
import PDFViewer from '@/components/PDFViewer';

const TrainingPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPDFViewer, setShowPDFViewer] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<any>(null);
  
  // Check if user has access to training features
  const hasTrainingAccess = user?.features?.training || false;
  
  // Fetch training content
  const { data: trainingContent, isLoading: contentLoading } = useContentLibrary('exercise');
  
  // Fetch user's training files
  const { data: userFiles, isLoading: filesLoading } = useUserFiles('training');
  
  // Daily habits for completion tracking
  const { data: todayHabits, mutate: updateHabits } = useDailyHabits();
  
  // Workout of the day
  const { data: workoutOfDay, isLoading: workoutLoading } = useWorkoutOfDay();

  const handleCompleteTraining = async () => {
    try {
      await updateHabits({
        date: new Date().toISOString().split('T')[0],
        training_completed: !todayHabits?.training_completed
      });
      
      toast({
        title: todayHabits?.training_completed ? "Entrenamiento marcado como no completado" : "¡Entrenamiento completado!",
        description: todayHabits?.training_completed ? 
          "Has desmarcado el entrenamiento de hoy" : 
          "¡Excelente trabajo! Has completado tu entrenamiento de hoy.",
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

  const getVideoEmbedUrl = (url: string) => {
    // Convert YouTube watch URLs to embed URLs
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1];
      const ampersandPosition = videoId.indexOf('&');
      if (ampersandPosition !== -1) {
        return `https://www.youtube.com/embed/${videoId.substring(0, ampersandPosition)}`;
      }
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Convert YouTube short URLs
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // For other URLs, return as is (assuming they're already embed-ready)
    return url;
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
          Accede a tu rutina de entrenamiento, videos y planes personalizados
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Training Completion Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5" />
              Entrenamiento de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
                  todayHabits?.training_completed ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Dumbbell className={`w-8 h-8 ${
                    todayHabits?.training_completed ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <p className="font-medium mb-2">
                  {todayHabits?.training_completed ? '¡Completado!' : 'Pendiente'}
                </p>
              </div>
              
              <Button 
                onClick={handleCompleteTraining}
                className="w-full"
                variant={todayHabits?.training_completed ? "outline" : "default"}
              >
                {todayHabits?.training_completed ? 'Marcar como no hecho' : 'Marcar como completado'}
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
          </CardHeader>
          <CardContent>
            {filesLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Cargando plan...</p>
              </div>
            ) : userFiles && userFiles.length > 0 ? (
              <div className="space-y-3">
                {userFiles.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-sm">{file.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.created_at).toLocaleDateString()}
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
              <div className="text-center py-4">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No tienes planes asignados aún</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workout of the Day Card */}
        <Card>
          <CardHeader>
            <CardTitle>Entrenamiento del Día</CardTitle>
          </CardHeader>
          <CardContent>
            {workoutLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Cargando entrenamiento...</p>
              </div>
            ) : workoutOfDay ? (
              <div className="space-y-3">
                <h3 className="font-medium">{workoutOfDay.title}</h3>
                {workoutOfDay.description && (
                  <p className="text-sm text-muted-foreground">{workoutOfDay.description}</p>
                )}
                <Button size="sm" className="w-full">
                  <Play className="w-4 h-4 mr-2" />
                  Ver Entrenamiento
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <Dumbbell className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay entrenamiento programado para hoy</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Training Videos Section */}
      <Card>
        <CardHeader>
          <CardTitle>Videos de Entrenamiento</CardTitle>
          <CardDescription>
            Biblioteca completa de ejercicios y rutinas de entrenamiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contentLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 aspect-video rounded-lg mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : trainingContent && trainingContent.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trainingContent.map(content => (
                <Card key={content.id} className="overflow-hidden">
                  <div className="aspect-video bg-gray-100">
                    {content.video_url ? (
                      content.video_url.includes('youtube.com') || content.video_url.includes('youtu.be') ? (
                        <iframe
                          src={getVideoEmbedUrl(content.video_url)}
                          className="w-full h-full"
                          frameBorder="0"
                          allowFullScreen
                          title={content.title}
                        />
                      ) : (
                        <video
                          src={content.video_url}
                          className="w-full h-full object-cover"
                          controls
                          preload="metadata"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 line-clamp-2">{content.title}</h3>
                    {content.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                        {content.description}
                      </p>
                    )}
                    {content.subcategory && (
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full mb-3">
                        {content.subcategory}
                      </span>
                    )}
                    {content.video_url && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.open(content.video_url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver Completo
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Dumbbell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
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