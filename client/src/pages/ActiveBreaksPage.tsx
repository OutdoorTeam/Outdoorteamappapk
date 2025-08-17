import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Coffee, Clock, Video, Zap, Stretch, Target, Heart } from 'lucide-react';
import { useContentLibrary } from '@/hooks/api/use-content-library';

const ActiveBreaksPage: React.FC = () => {
  const { data: activeBreakVideos = [], isLoading } = useContentLibrary('active_breaks');

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
        <div className="text-lg">Cargando pausas activas...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Coffee className="w-8 h-8 text-orange-600" />
          Pausas Activas
        </h1>
        <p className="text-muted-foreground">
          Ejercicios cortos y efectivos para romper la rutina sedentaria y reactivar tu energía
        </p>
      </div>

      {/* Introduction Section */}
      <Card className="mb-8 border-l-4 border-l-orange-500">
        <CardHeader>
          <CardTitle className="text-orange-600">¿Qué son las Pausas Activas?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Las pausas activas son breves sesiones de ejercicios físicos que se realizan durante 
            la jornada laboral o de estudio para combatir el sedentarismo y mejorar el bienestar.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <Zap className="w-8 h-8 text-orange-600" />
              <div>
                <h4 className="font-semibold text-orange-800">Energiza</h4>
                <p className="text-sm text-orange-600">Reactiva tu cuerpo</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Stretch className="w-8 h-8 text-blue-600" />
              <div>
                <h4 className="font-semibold text-blue-800">Estira</h4>
                <p className="text-sm text-blue-600">Relaja tensiones</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Target className="w-8 h-8 text-green-600" />
              <div>
                <h4 className="font-semibold text-green-800">Enfoca</h4>
                <p className="text-sm text-green-600">Mejora concentración</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
              <Heart className="w-8 h-8 text-red-600" />
              <div>
                <h4 className="font-semibold text-red-800">Activa</h4>
                <p className="text-sm text-red-600">Mejora circulación</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Videos Section */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-green-500" />
            <CardTitle className="text-green-500">Videos de Pausas Activas</CardTitle>
          </div>
          <CardDescription>
            Rutinas cortas y efectivas que puedes hacer desde cualquier lugar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeBreakVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeBreakVideos.map((video: any) => (
                <Card key={video.id} className="hover:shadow-lg transition-all hover:scale-105 group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg leading-tight pr-2">{video.title}</CardTitle>
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                        <Play className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                    <CardDescription className="text-sm">
                      {video.description || 'Rutina de pausa activa'}
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
                      className="w-full group-hover:bg-green-600 group-hover:text-white transition-colors bg-green-50 text-green-600 border border-green-200 hover:bg-green-600"
                      size="sm"
                    >
                      <Play size={16} className="mr-2" />
                      Ver Rutina
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
                Estamos preparando una colección completa de pausas activas para ti.
              </p>
              
              {/* Default exercises while videos are being added */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <Card className="bg-orange-50 border border-orange-200">
                  <CardContent className="p-4 text-center">
                    <Stretch className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-orange-800">Estiramiento de Cuello</h4>
                    <p className="text-sm text-orange-600">2-3 minutos</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-blue-50 border border-blue-200">
                  <CardContent className="p-4 text-center">
                    <Zap className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-blue-800">Activación Postural</h4>
                    <p className="text-sm text-blue-600">5 minutos</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-green-50 border border-green-200">
                  <CardContent className="p-4 text-center">
                    <Heart className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-green-800">Movilidad Articular</h4>
                    <p className="text-sm text-green-600">3-4 minutos</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips Section */}
      <Card className="mt-8 bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
        <CardHeader>
          <CardTitle className="text-orange-700">💡 Tips para Pausas Activas Efectivas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-orange-800">Frecuencia</h4>
              <ul className="text-sm text-orange-700 space-y-2">
                <li>• Cada 1-2 horas durante tu jornada</li>
                <li>• Mínimo 3-5 minutos por sesión</li>
                <li>• Adapta según tu nivel de actividad</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-orange-800">Beneficios</h4>
              <ul className="text-sm text-orange-700 space-y-2">
                <li>• Reduce tensión muscular</li>
                <li>• Mejora concentración y productividad</li>
                <li>• Previene lesiones por posturas estáticas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActiveBreaksPage;