import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coffee, Play, ExternalLink, Clock, Zap, PlayCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useContentLibrary } from '@/hooks/api/use-content-library';
import { useTodayHabits, useUpdateHabit } from '@/hooks/api/use-daily-habits';
import { getYouTubeThumbnail } from '@/utils/youtube';

const ActiveBreaksPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Check if user has access to active breaks features
  const hasActiveBreaksAccess = user?.features?.active_breaks || false;
  
  // Fetch active breaks content videos using the correct hook
  const { data: activeBreaksVideos, isLoading: videosLoading } = useContentLibrary('active_breaks');
  
  // Daily habits for completion tracking
  const { data: todayHabits } = useTodayHabits();
  const updateHabitMutation = useUpdateHabit();

  const handleCompleteActiveBreak = async () => {
    try {
      await updateHabitMutation.mutateAsync({
        date: new Date().toISOString().split('T')[0],
        movement_completed: !todayHabits?.movement_completed
      });
      
      toast({
        title: todayHabits?.movement_completed ? "Pausa activa marcada como no completada" : "¡Pausa activa completada!",
        description: todayHabits?.movement_completed ? 
          "Has desmarcado la pausa activa de hoy" : 
          "¡Excelente! Has completado tu pausa activa de hoy.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating active break completion:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la pausa activa",
        variant: "destructive",
      });
    }
  };

  const handleOpenVideo = (videoUrl: string) => {
    window.open(videoUrl, '_blank');
  };

  if (!hasActiveBreaksAccess) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Coffee className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-600 mb-4">Acceso a Pausas Activas</h2>
          <p className="text-muted-foreground mb-6">
            Tu plan actual no incluye acceso a la sección de pausas activas.
          </p>
          <p className="text-sm text-muted-foreground">
            Contacta al administrador para actualizar tu plan y acceder a esta funcionalidad.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pausas Activas</h1>
        <p className="text-muted-foreground">
          Rompe con la rutina del trabajo con ejercicios cortos y energizantes
        </p>
      </div>

      {/* Active Break Completion Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="w-5 h-5" />
            Pausa Activa de Hoy
          </CardTitle>
          <CardDescription>
            Mantente activo durante tu jornada laboral con ejercicios de estiramiento y movimiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                todayHabits?.movement_completed ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Coffee className={`w-8 h-8 ${
                  todayHabits?.movement_completed ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>
              <div>
                <p className="font-medium">
                  {todayHabits?.movement_completed ? '¡Pausa activa completada!' : 'Pausa activa pendiente'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {todayHabits?.movement_completed ? 
                    'Excelente trabajo manteniendo tu cuerpo activo' : 
                    'Toma un descanso activo para energizar tu día'}
                </p>
              </div>
            </div>
            
            <Button 
              onClick={handleCompleteActiveBreak}
              variant={todayHabits?.movement_completed ? "outline" : "default"}
              disabled={updateHabitMutation.isPending}
            >
              <Zap className="w-4 h-4 mr-2" />
              {updateHabitMutation.isPending 
                ? 'Actualizando...'
                : todayHabits?.movement_completed 
                  ? 'Marcar como no hecho' 
                  : 'Marcar como completado'
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Breaks Videos Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5" />
            Videos de Pausas Activas
          </CardTitle>
          <CardDescription>
            Ejercicios rápidos y efectivos para hacer durante tus descansos laborales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {videosLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Cargando videos...</p>
            </div>
          ) : activeBreaksVideos && activeBreaksVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeBreaksVideos.map(video => {
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
                        <PlayCircle className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
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
                Los videos de pausas activas aparecerán aquí una vez que sean agregados por el administrador.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Consejos para Pausas Activas Efectivas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">¿Cuándo hacer pausas activas?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Cada 1-2 horas de trabajo</li>
                <li>• Cuando sientes tensión muscular</li>
                <li>• Al iniciar o finalizar el día laboral</li>
                <li>• Durante reuniones largas (si es posible)</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Beneficios</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Reduce la tensión muscular</li>
                <li>• Mejora la circulación sanguínea</li>
                <li>• Aumenta la concentración</li>
                <li>• Previene lesiones por posturas repetitivas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActiveBreaksPage;
