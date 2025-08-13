import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import MeditationSession from '@/components/MeditationSession';

const MeditationPage: React.FC = () => {
  const { user } = useAuth();
  const [meditationSessions, setMeditationSessions] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    fetchMeditationSessions();
  }, []);

  const fetchMeditationSessions = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/meditation-sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const sessions = await response.json();
        setMeditationSessions(sessions);
      }
    } catch (error) {
      console.error('Error fetching meditation sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMeditationComplete = async (duration: number, type: string, comment: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      
      // Save meditation session
      await fetch('/api/meditation-sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          duration_minutes: duration,
          meditation_type: type,
          comment: comment
        })
      });

      // Update meditation habit if user has the feature
      if (user?.features?.meditation) {
        await fetch('/api/daily-habits/update', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            date: new Date().toISOString().split('T')[0],
            meditation_completed: true
          })
        });
      }
      
      alert('¡Meditación completada! Se registró tu sesión exitosamente.');
      fetchMeditationSessions(); // Refresh the list
    } catch (error) {
      console.error('Error completing meditation:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando meditación...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Meditación y Mindfulness</h1>
        <p className="text-muted-foreground">Centra tu mente y encuentra la paz interior</p>
      </div>

      <div className="space-y-8">
        {/* Meditation Session Component */}
        <MeditationSession onComplete={handleMeditationComplete} />

        {/* Benefits of Meditation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Beneficios de la Meditación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <div className="text-4xl mb-3">🧠</div>
                <h4 className="font-semibold mb-2">Mejora la Concentración</h4>
                <p className="text-sm text-muted-foreground">
                  La práctica regular de meditación fortalece tu capacidad de mantener la atención
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="text-4xl mb-3">❤️</div>
                <h4 className="font-semibold mb-2">Reduce el Estrés</h4>
                <p className="text-sm text-muted-foreground">
                  Disminuye los niveles de cortisol y promueve la relajación profunda
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="text-4xl mb-3">😌</div>
                <h4 className="font-semibold mb-2">Mejora el Bienestar</h4>
                <p className="text-sm text-muted-foreground">
                  Aumenta la sensación de calma y equilibrio emocional
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meditation Types */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Meditación</CardTitle>
            <CardDescription>Diferentes enfoques para tu práctica diaria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">Meditación Mindfulness</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Enfócate en el momento presente, observando tus pensamientos sin juzgar
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Ideal para principiantes</li>
                  <li>• Reduce la ansiedad</li>
                  <li>• Mejora la autoconciencia</li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">Meditación de Respiración</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Utiliza patrones de respiración para calmar la mente y el cuerpo
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Calma el sistema nervioso</li>
                  <li>• Fácil de practicar en cualquier lugar</li>
                  <li>• Mejora la capacidad pulmonar</li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">Meditación de Visualización</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Usa imágenes mentales para crear estados de calma y bienestar
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Estimula la creatividad</li>
                  <li>• Reduce el estrés</li>
                  <li>• Mejora la claridad mental</li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">Meditación de Gratitud</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Cultiva pensamientos de agradecimiento y apreciación
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Mejora el estado de ánimo</li>
                  <li>• Fortalece las relaciones</li>
                  <li>• Aumenta la satisfacción personal</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle>Cómo Empezar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-primary">Para Principiantes</h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Comienza con 5 minutos al día</li>
                  <li>• Encuentra un lugar tranquilo</li>
                  <li>• Usa una postura cómoda</li>
                  <li>• Sé paciente contigo mismo</li>
                  <li>• Practica a la misma hora cada día</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-primary">Consejos Avanzados</h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Aumenta gradualmente la duración</li>
                  <li>• Experimenta con diferentes técnicas</li>
                  <li>• Únete a grupos de meditación</li>
                  <li>• Lleva un diario de práctica</li>
                  <li>• Busca orientación de maestros experimentados</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        {meditationSessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tus Sesiones Recientes</CardTitle>
              <CardDescription>Historial de tu práctica de meditación</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {meditationSessions.slice(0, 5).map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{session.meditation_type} - {session.duration_minutes} min</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(session.completed_at).toLocaleDateString()}
                      </div>
                      {session.comment && (
                        <div className="text-sm text-muted-foreground mt-1">
                          "{session.comment}"
                        </div>
                      )}
                    </div>
                    <div className="text-green-600">
                      ✓
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MeditationPage;