import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Play, ExternalLink, Clock, Sparkles, PlayCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useContentLibrary } from '@/hooks/api/use-content-library';
import { useTodayHabits, useUpdateHabit } from '@/hooks/api/use-daily-habits';
import { useSaveMeditationSession } from '@/hooks/api/use-meditation';
import MeditationSession from '@/components/MeditationSession';
import { getYouTubeThumbnail } from '@/utils/youtube';

const MeditationPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showMeditationSession, setShowMeditationSession] = React.useState(false);
  
  // Check if user has access to meditation features
  const hasMeditationAccess = user?.features?.meditation || false;
  
  // Fetch meditation content videos using the correct hook
  const { data: meditationVideos, isLoading: videosLoading } = useContentLibrary('meditation');
  
  // Daily habits for completion tracking
  const { data: todayHabits } = useTodayHabits();
  const updateHabitMutation = useUpdateHabit();
  const saveMeditationMutation = useSaveMeditationSession();

  const handleCompleteMeditation = async () => {
    try {
      await updateHabitMutation.mutateAsync({
        date: new Date().toISOString().split('T')[0],
        meditation_completed: !todayHabits?.meditation_completed
      });
      
      toast({
        title: todayHabits?.meditation_completed ? "Meditación marcada como no completada" : "¡Meditación completada!",
        description: todayHabits?.meditation_completed ? 
          "Has desmarcado la meditación de hoy" : 
          "¡Excelente! Has completado tu meditación de hoy.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating meditation completion:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la meditación",
        variant: "destructive",
      });
    }
  };

  const handleMeditationSessionComplete = async (duration: number, type: string, comment: string) => {
    try {
      // Save the meditation session
      await saveMeditationMutation.mutateAsync({
        duration_minutes: duration,
        meditation_type: type as 'guided' | 'free',
        comment: comment || undefined
      });

      // Mark meditation as completed
      await updateHabitMutation.mutateAsync({
        date: new Date().toISOString().split('T')[0],
        meditation_completed: true
      });

      toast({
        title: "¡Meditación completada!",
        description: `Has meditado por ${duration} minutos. ¡Excelente trabajo!`,
        variant: "default",
      });

      setShowMeditationSession(false);
    } catch (error) {
      console.error('Error completing meditation session:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la sesión de meditación",
        variant: "destructive",
      });
      setShowMeditationSession(false);
    }
  };

  const handleOpenVideo = (videoUrl: string) => {
    window.open(videoUrl, '_blank');
  };

  if (!hasMeditationAccess) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-600 mb-4">Acceso a Meditación</h2>
          <p className="text-muted-foreground mb-6">
            Tu plan actual no incluye acceso a la sección de meditación.
          </p>
          <p className="text-sm text-muted-foreground">
            Contacta al administrador para actualizar tu plan y acceder a esta funcionalidad.
          </p>
        </div>
      </div>
    );
  }

  if (showMeditationSession) {
    return (
      <div className="container mx-auto px-4 py-8">
        <MeditationSession
          onComplete={handleMeditationSessionComplete}
          onCancel={() => setShowMeditationSession(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Meditación</h1>
        <p className="text-muted-foreground">
          Encuentra paz y tranquilidad con ejercicios de meditación y mindfulness
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Meditation Completion Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Meditación de Hoy
            </CardTitle>
            <CardDescription>
              Dedica unos minutos a calmar tu mente y encontrar equilibrio interior
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  todayHabits?.meditation_completed ? 'bg-purple-100' : 'bg-gray-100'
                }`}>
                  <Brain className={`w-8 h-8 ${
                    todayHabits?.meditation_completed ? 'text-purple-600' : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <p className="font-medium">
                    {todayHabits?.meditation_completed ? '¡Meditación completada!' : 'Meditación pendiente'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {todayHabits?.meditation_completed ? 
                      'Has cultivado paz interior hoy' : 
                      'Toma unos minutos para meditar'}
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={handleCompleteMeditation}
                variant={todayHabits?.meditation_completed ? "outline" : "default"}
                disabled={updateHabitMutation.isPending}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {updateHabitMutation.isPending 
                  ? 'Actualizando...'
                  : todayHabits?.meditation_completed 
                    ? 'Marcar como no hecho' 
                    : 'Marcar como completado'
                }
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Meditation Session Card */}
        <Card>
          <CardHeader>
            <CardTitle>Sesión de Meditación</CardTitle>
            <CardDescription>
              Inicia una sesión de meditación guiada o libre con temporizador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-purple-100 mx-auto mb-4 flex items-center justify-center">
                  <Brain className="w-10 h-10 text-purple-600" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Elige tu tipo de meditación preferida y relájate
                </p>
              </div>
              
              <Button 
                onClick={() => setShowMeditationSession(true)}
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                Comenzar Meditación
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meditation Videos Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5" />
            Videos de Meditación
          </CardTitle>
          <CardDescription>
            Explora nuestra biblioteca de videos de meditación y mindfulness
          </CardDescription>
        </CardHeader>
        <CardContent>
          {videosLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Cargando videos...</p>
            </div>
          ) : meditationVideos && meditationVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meditationVideos.map(video => {
                const thumbnail = getYouTubeThumbnail(video.video_url);
                
                return (
                  <Card key={video.id} className="overflow-hidden hover:shadow-md transition-shadow group">
                    {/* Video Thumbnail */}
                    {thumbnail ? (
                      <div className="relative aspect-video">
                        <img
                          src={thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to default thumbnail if maxres fails
                            const target = e.target as HTMLImageElement;
                            if (target.src.includes('maxresdefault')) {
                              target.src = target.src.replace('maxresdefault', 'mqdefault');
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-12 h-12 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-200 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <PlayCircle className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">Video</p>
                        </div>
                      </div>
                    )}

                    {/* Video Info */}
                    <div className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <PlayCircle className="w-6 h-6 text-purple-600 mt-1 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-lg mb-1 line-clamp-2">{video.title}</h3>
                          {video.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {video.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {video.video_url && (
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleOpenVideo(video.video_url)}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Ver Video
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <PlayCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No hay videos disponibles</h3>
              <p className="text-muted-foreground">
                Los videos de meditación aparecerán aquí una vez que sean agregados por el administrador.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Beneficios de la Meditación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-medium mb-2">Claridad Mental</h4>
              <p className="text-sm text-muted-foreground">
                Mejora la concentración y reduce el estrés mental
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-medium mb-2">Mejor Sueño</h4>
              <p className="text-sm text-muted-foreground">
                Favorece el descanso y la reparación nocturna
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-medium mb-2">Bienestar Emocional</h4>
              <p className="text-sm text-muted-foreground">
                Reduce la ansiedad y mejora el estado de ánimo
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MeditationPage;
