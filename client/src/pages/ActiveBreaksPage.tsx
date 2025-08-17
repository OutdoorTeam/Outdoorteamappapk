import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coffee, Play, ExternalLink, Clock, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useContentLibrary } from '@/hooks/api/use-content-library';
import { useDailyHabits } from '@/hooks/api/use-daily-habits';

const ActiveBreaksPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Check if user has access to active breaks features
  const hasActiveBreaksAccess = user?.features?.active_breaks || false;
  
  // Fetch active breaks content
  const { data: activeBreaksContent, isLoading: contentLoading } = useContentLibrary('active_breaks');
  
  // Daily habits for completion tracking
  const { data: todayHabits, mutate: updateHabits } = useDailyHabits();

  const handleCompleteActiveBreak = async () => {
    try {
      await updateHabits({
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'Principiante';
      case 'intermediate':
        return 'Intermedio';
      case 'advanced':
        return 'Avanzado';
      default:
        return difficulty;
    }
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
            >
              <Zap className="w-4 h-4 mr-2" />
              {todayHabits?.movement_completed ? 'Marcar como no hecho' : 'Marcar como completado'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Breaks Videos Section */}
      <Card>
        <CardHeader>
          <CardTitle>Videos de Pausas Activas</CardTitle>
          <CardDescription>
            Ejercicios rápidos y efectivos para hacer durante tus descansos laborales
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
          ) : activeBreaksContent && activeBreaksContent.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeBreaksContent.map(content => (
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
                    
                    <div className="flex items-center gap-2 mb-3">
                      {content.duration_minutes && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          <Clock className="w-3 h-3" />
                          {content.duration_minutes} min
                        </span>
                      )}
                      
                      {content.difficulty_level && (
                        <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(content.difficulty_level)}`}>
                          {getDifficultyLabel(content.difficulty_level)}
                        </span>
                      )}
                      
                      {content.subcategory && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                          {content.subcategory}
                        </span>
                      )}
                    </div>
                    
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
              <Coffee className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No hay videos disponibles</h3>
              <p className="text-muted-foreground">
                Los videos de pausas activas aparecerán aquí una vez que sean agregados por el administrador.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips Section */}
      <Card className="mt-6">
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