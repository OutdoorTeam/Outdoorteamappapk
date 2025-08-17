import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Play, ExternalLink, Clock, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useContentLibrary } from '@/hooks/api/use-content-library';
import { useDailyHabits } from '@/hooks/api/use-daily-habits';
import MeditationSession from '@/components/MeditationSession';

const MeditationPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showMeditationSession, setShowMeditationSession] = React.useState(false);
  
  // Check if user has access to meditation features
  const hasMeditationAccess = user?.features?.meditation || false;
  
  // Fetch meditation content
  const { data: meditationContent, isLoading: contentLoading } = useContentLibrary('meditation');
  
  // Daily habits for completion tracking
  const { data: todayHabits, mutate: updateHabits } = useDailyHabits();

  const handleCompleteMeditation = async () => {
    try {
      await updateHabits({
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
          onComplete={() => {
            setShowMeditationSession(false);
            // Optionally mark as completed automatically
            handleCompleteMeditation();
          }}
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
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {todayHabits?.meditation_completed ? 'Marcar como no hecho' : 'Marcar como completado'}
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
      <Card>
        <CardHeader>
          <CardTitle>Videos de Meditación</CardTitle>
          <CardDescription>
            Meditaciones guiadas para diferentes necesidades y niveles de experiencia
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
          ) : meditationContent && meditationContent.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meditationContent.map(content => (
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
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
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
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
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
              <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No hay videos disponibles</h3>
              <p className="text-muted-foreground">
                Los videos de meditación aparecerán aquí una vez que sean agregados por el administrador.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <Card className="mt-6">
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