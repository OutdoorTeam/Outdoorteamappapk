import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Play, Clock, Target } from 'lucide-react';

const ActiveBreaksPage: React.FC = () => {
  const { user } = useAuth();
  const [contentLibrary, setContentLibrary] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    fetchContentLibrary();
  }, []);

  const fetchContentLibrary = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/content-library', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const content = await response.json();
        setContentLibrary(content.filter((item: any) => item.category === 'active_breaks'));
      }
    } catch (error) {
      console.error('Error fetching content library:', error);
    } finally {
      setIsLoading(false);
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
        <h1 className="text-3xl font-bold mb-2">Pausas Activas</h1>
        <p className="text-muted-foreground">Ejercicios rápidos para mantenerte activo durante el día</p>
      </div>

      <div className="space-y-8">
        {/* Benefits of Active Breaks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">¿Por qué hacer Pausas Activas?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Mejora la Concentración</h4>
                <p className="text-sm text-muted-foreground">
                  Aumenta tu productividad y claridad mental con descansos activos
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Reduce el Estrés</h4>
                <p className="text-sm text-muted-foreground">
                  Libera tensiones acumuladas y mejora tu estado de ánimo
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Play className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Previene Lesiones</h4>
                <p className="text-sm text-muted-foreground">
                  Evita problemas posturales y molestias por estar sentado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Break Exercises */}
        <Card>
          <CardHeader>
            <CardTitle>Ejercicios de Pausas Activas</CardTitle>
            <CardDescription>Rutinas cortas para hacer en cualquier momento del día</CardDescription>
          </CardHeader>
          <CardContent>
            {contentLibrary.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contentLibrary.map((content: any) => (
                  <Card key={content.id} className="border border-primary/20 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{content.title}</CardTitle>
                      {content.subcategory && (
                        <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded-full w-fit">
                          {content.subcategory}
                        </span>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{content.description}</p>
                      {content.video_url && (
                        <Button 
                          className="w-full"
                          onClick={() => window.open(content.video_url, '_blank')}
                        >
                          <Play size={16} className="mr-2" />
                          Ver Video
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No hay ejercicios de pausas activas disponibles en este momento.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Consejos para Pausas Activas Efectivas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-primary">Cuándo Hacerlas</h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Cada 1-2 horas de trabajo sedentario</li>
                  <li>• Al sentir tensión en cuello u hombros</li>
                  <li>• Durante cambios de actividad</li>
                  <li>• En momentos de baja energía</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-primary">Cómo Maximizar Beneficios</h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Mantén una respiración profunda</li>
                  <li>• Concéntrate en los músculos que trabajas</li>
                  <li>• Realiza movimientos controlados</li>
                  <li>• Adapta ejercicios según tu espacio</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Routines */}
        <Card>
          <CardHeader>
            <CardTitle>Rutinas Rápidas</CardTitle>
            <CardDescription>Secuencias de ejercicios para diferentes momentos del día</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Energizante Matutino</h4>
                <p className="text-sm text-muted-foreground mb-3">3-5 minutos</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Estiramientos de brazos</li>
                  <li>• Rotaciones de cuello</li>
                  <li>• Flexiones de rodilla</li>
                  <li>• Respiraciones profundas</li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Pausa de Oficina</h4>
                <p className="text-sm text-muted-foreground mb-3">2-3 minutos</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Estiramientos de muñecas</li>
                  <li>• Giros de columna</li>
                  <li>• Elevación de hombros</li>
                  <li>• Parpadeos conscientes</li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Descanso Vespertino</h4>
                <p className="text-sm text-muted-foreground mb-3">5-7 minutos</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Flexiones de cadera</li>
                  <li>• Estiramientos de espalda</li>
                  <li>• Movilidad de tobillos</li>
                  <li>• Relajación muscular</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActiveBreaksPage;