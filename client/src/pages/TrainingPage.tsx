import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Play, Calendar, User, FileText, Clock, Video, Eye, Download } from 'lucide-react';
import { useWorkoutOfDay } from '@/hooks/api/use-workout';
import { useUserFiles } from '@/hooks/api/use-user-files';
import { useContentLibrary } from '@/hooks/api/use-content-library';
import PDFViewer from '@/components/PDFViewer';

const TrainingPage: React.FC = () => {
  const { user } = useAuth();
  const [showPDFViewer, setShowPDFViewer] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<any>(null);
  
  // Use React Query hooks
  const { data: workoutOfDay, isLoading: workoutLoading } = useWorkoutOfDay();
  const { data: userFiles = [], isLoading: filesLoading } = useUserFiles('training');
  const { data: trainingVideos = [], isLoading: videosLoading } = useContentLibrary('exercise');

  const isLoading = workoutLoading || filesLoading || videosLoading;

  const handleViewPDF = (file: any) => {
    setSelectedFile(file);
    setShowPDFViewer(true);
  };

  const openVideo = (videoUrl: string, title: string) => {
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      window.open(videoUrl, '_blank');
    } else {
      window.open(videoUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando área de entrenamiento...</div>
      </div>
    );
  }

  if (showPDFViewer && selectedFile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PDFViewer 
          fileId={selectedFile.id} 
          filename={selectedFile.filename}
          onClose={() => setShowPDFViewer(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Área de Entrenamiento</h1>
        <p className="text-muted-foreground">Tu espacio completo para entrenar y alcanzar tus objetivos</p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Training of the Day - Common for all users */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <CardTitle className="text-primary">Entrenamiento del Día</CardTitle>
            </div>
            <CardDescription>Rutina diaria diseñada para todos los usuarios de Outdoor Team</CardDescription>
          </CardHeader>
          <CardContent>
            {workoutOfDay ? (
              <div className="space-y-6">
                <div className="bg-primary/5 p-4 rounded-lg">
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    {workoutOfDay.title}
                  </h3>
                  <p className="text-muted-foreground mb-4">{workoutOfDay.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(workoutOfDay.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {JSON.parse(workoutOfDay.exercises_json || '[]').map((exercise: any, index: number) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                          {exercise.name}
                          <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                            #{index + 1}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{exercise.description}</p>
                        {exercise.sets && exercise.reps && (
                          <div className="text-sm font-medium mb-3 bg-gray-50 p-2 rounded">
                            <strong>{exercise.sets}</strong> series × <strong>{exercise.reps}</strong> repeticiones
                          </div>
                        )}
                        {exercise.duration && (
                          <div className="text-sm font-medium mb-3 bg-blue-50 p-2 rounded text-blue-700">
                            Duración: <strong>{exercise.duration}</strong>
                          </div>
                        )}
                        {exercise.video_url && (
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => openVideo(exercise.video_url, exercise.name)}
                          >
                            <Play size={16} className="mr-2" />
                            Ver Video Instructivo
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {JSON.parse(workoutOfDay.exercises_json || '[]').length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Los ejercicios específicos se cargarán pronto. ¡Mantente activo!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No hay entrenamiento programado</h3>
                <p className="text-muted-foreground">
                  El entrenamiento del día se actualizará pronto. ¡Vuelve más tarde!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Training Videos */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-orange-500" />
              <CardTitle className="text-orange-500">Videos de Entrenamiento</CardTitle>
            </div>
            <CardDescription>
              Videos instructivos y rutinas de ejercicios para complementar tu entrenamiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trainingVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trainingVideos.map((video: any) => (
                  <Card key={video.id} className="hover:shadow-lg transition-all hover:scale-105 group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg leading-tight pr-2">{video.title}</CardTitle>
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                          <Play className="w-5 h-5 text-orange-600" />
                        </div>
                      </div>
                      <CardDescription className="text-sm">
                        {video.description || 'Video de entrenamiento'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button 
                        onClick={() => openVideo(video.video_url, video.title)}
                        className="w-full group-hover:bg-orange-600 group-hover:text-white transition-colors bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-600"
                        size="sm"
                      >
                        <Play size={16} className="mr-2" />
                        Ver Video
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No hay videos de entrenamiento disponibles en este momento.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Personalized Training Plan */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-blue-500">Tu Plan de Entrenamiento Personalizado</CardTitle>
            </div>
            <CardDescription>
              Plan diseñado específicamente para tus objetivos, nivel y disponibilidad
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userFiles.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Plan Personalizado Disponible</h4>
                  <p className="text-blue-700 text-sm mb-3">
                    Tu entrenador ha creado un plan específico basado en tu evaluación inicial, 
                    objetivos y disponibilidad de tiempo.
                  </p>
                </div>
                
                {userFiles.map((file: any) => (
                  <Card key={file.id} className="border-blue-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-blue-800">Plan de Entrenamiento</h4>
                            <p className="text-sm text-blue-600">
                              Subido el {new Date(file.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleViewPDF(file)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Mi Plan
                          </Button>
                          <Button
                            onClick={() => window.open(`/api/files/${file.id}`, '_blank')}
                            variant="outline"
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Descargar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-blue-50 rounded-lg border border-blue-200">
                <User className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-blue-600 mb-2">
                  Plan Personalizado En Proceso
                </h3>
                <p className="text-blue-600 mb-6 max-w-md mx-auto">
                  Nuestros entrenadores están preparando tu plan personalizado. 
                  Te notificaremos cuando esté listo.
                </p>
                <div className="bg-blue-100 p-4 rounded-lg max-w-md mx-auto">
                  <h4 className="font-semibold text-blue-800 mb-2">Mientras tanto:</h4>
                  <ul className="text-sm text-blue-700 text-left space-y-1">
                    <li>✓ Practica el entrenamiento del día</li>
                    <li>✓ Explora los videos de ejercicios</li>
                    <li>✓ Mantén consistencia con tus hábitos diarios</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrainingPage;