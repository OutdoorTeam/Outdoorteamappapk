import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Brain, Video, Clock, Heart, Pause, RotateCcw } from 'lucide-react';
import { useContentLibrary } from '@/hooks/api/use-content-library';
import MeditationSession from '@/components/MeditationSession';

const MeditationPage: React.FC = () => {
  const { data: meditationVideos = [], isLoading } = useContentLibrary('meditation');
  const [showSession, setShowSession] = React.useState(false);

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
        <div className="text-lg">Cargando área de meditación...</div>
      </div>
    );
  }

  if (showSession) {
    return (
      <div className="container mx-auto px-4 py-8">
        <MeditationSession onClose={() => setShowSession(false)} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Brain className="w-8 h-8 text-purple-600" />
          Área de Meditación
        </h1>
        <p className="text-muted-foreground">
          Encuentra tu paz interior y desarrolla mindfulness para una vida más plena
        </p>
      </div>

      <div className="space-y-8">
        {/* Quick Start Section */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-purple-500" />
              <CardTitle className="text-purple-500">Sesión de Meditación</CardTitle>
            </div>
            <CardDescription>
              Inicia una sesión guiada de respiración consciente y relajación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-purple-800 mb-2">
                  Meditación Guiada
                </h3>
                <p className="text-purple-600 mb-6 max-w-md mx-auto">
                  Sesión interactiva con ejercicios de respiración, visualización y mindfulness. 
                  Perfecta para principiantes y practicantes experimentados.
                </p>
                <Button 
                  onClick={() => setShowSession(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Iniciar Sesión de Meditación
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meditation Videos */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-blue-500">Videos de Meditación</CardTitle>
            </div>
            <CardDescription>
              Colección de meditaciones guiadas para diferentes momentos y necesidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            {meditationVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {meditationVideos.map((video: any) => (
                  <Card key={video.id} className="hover:shadow-lg transition-all hover:scale-105 group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg leading-tight pr-2">{video.title}</CardTitle>
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                          <Play className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                      <CardDescription className="text-sm">
                        {video.description || 'Sesión de meditación guiada'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {video.duration_minutes && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {video.duration_minutes} minutos
                        </div>
                      )}
                      <Button 
                        onClick={() => openVideo(video.video_url, video.title)}
                        className="w-full group-hover:bg-blue-600 group-hover:text-white transition-colors bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-600"
                        size="sm"
                      >
                        <Play size={16} className="mr-2" />
                        Ver Meditación
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Videos En Preparación
                </h3>
                <p className="text-muted-foreground mb-6">
                  Estamos preparando una biblioteca completa de meditaciones guiadas.
                </p>
                
                {/* Default meditation types while videos are being added */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  <Card className="bg-purple-50 border border-purple-200">
                    <CardContent className="p-4 text-center">
                      <Brain className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-purple-800">Mindfulness</h4>
                      <p className="text-sm text-purple-600">Atención plena</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-blue-50 border border-blue-200">
                    <CardContent className="p-4 text-center">
                      <Heart className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-blue-800">Respiración</h4>
                      <p className="text-sm text-blue-600">Técnicas de pranayama</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-green-50 border border-green-200">
                    <CardContent className="p-4 text-center">
                      <Pause className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-green-800">Relajación</h4>
                      <p className="text-sm text-green-600">Liberación de tensiones</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Benefits Section */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-700">🧘 Beneficios de la Meditación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-purple-800 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Mental
                </h4>
                <ul className="text-sm text-purple-700 space-y-2">
                  <li>• Reduce estrés y ansiedad</li>
                  <li>• Mejora concentración y foco</li>
                  <li>• Aumenta creatividad</li>
                  <li>• Desarrolla autoconsciencia</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Físico
                </h4>
                <ul className="text-sm text-blue-700 space-y-2">
                  <li>• Reduce presión arterial</li>
                  <li>• Mejora calidad del sueño</li>
                  <li>• Fortalece sistema inmune</li>
                  <li>• Alivia dolores crónicos</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-green-800 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Emocional
                </h4>
                <ul className="text-sm text-green-700 space-y-2">
                  <li>• Desarrolla paciencia</li>
                  <li>• Mejora relaciones interpersonales</li>
                  <li>• Aumenta compasión y empatía</li>
                  <li>• Promueve bienestar general</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Getting Started Guide */}
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-700">🌟 Consejos para Principiantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-orange-800">Para empezar</h4>
                <ul className="text-sm text-orange-700 space-y-2">
                  <li>• Comienza con 5-10 minutos diarios</li>
                  <li>• Busca un lugar tranquilo y cómodo</li>
                  <li>• Mantén la espalda recta pero relajada</li>
                  <li>• No juzgues tus pensamientos</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-orange-800">Mantener la práctica</h4>
                <ul className="text-sm text-orange-700 space-y-2">
                  <li>• Establece un horario fijo</li>
                  <li>• Se paciente contigo mismo</li>
                  <li>• Incrementa gradualmente el tiempo</li>
                  <li>• Combina diferentes técnicas</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MeditationPage;