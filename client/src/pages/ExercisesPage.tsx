import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import MeditationSession from '@/components/MeditationSession';

const ExercisesPage: React.FC = () => {
  const { user } = useAuth();

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

      // Update meditation habit
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
      
      alert('¡Ejercicio completado! Se agregó 1 punto a tu progreso diario.');
    } catch (error) {
      console.error('Error completing meditation:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Ejercicios de Respiración y Relajación</h1>
        <p className="text-muted-foreground">Prácticas de mindfulness y respiración para tu bienestar</p>
      </div>

      <div className="space-y-8">
        {/* Meditation Session Component */}
        <MeditationSession onComplete={handleMeditationComplete} />

        {/* Benefits of Breathing Exercises */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Beneficios de los Ejercicios de Respiración</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <div className="text-4xl mb-3">🧘</div>
                <h4 className="font-semibold mb-2">Reduce el Estrés</h4>
                <p className="text-sm text-muted-foreground">
                  Los ejercicios de respiración activan el sistema nervioso parasimpático, reduciendo cortisol
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="text-4xl mb-3">💡</div>
                <h4 className="font-semibold mb-2">Mejora la Concentración</h4>
                <p className="text-sm text-muted-foreground">
                  La práctica regular aumenta la atención sostenida y la claridad mental
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="text-4xl mb-3">💤</div>
                <h4 className="font-semibold mb-2">Mejor Calidad del Sueño</h4>
                <p className="text-sm text-muted-foreground">
                  Las técnicas de relajación preparan el cuerpo para un descanso profundo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Breathing Techniques */}
        <Card>
          <CardHeader>
            <CardTitle>Técnicas de Respiración</CardTitle>
            <CardDescription>Diferentes métodos para distintos momentos del día</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">Respiración 4-7-8</h4>
                <p className="text-sm text-muted-foreground mb-3">Ideal para relajación y antes de dormir</p>
                <div className="space-y-2 text-sm">
                  <div><strong>Inhalar:</strong> 4 segundos por la nariz</div>
                  <div><strong>Retener:</strong> 7 segundos</div>
                  <div><strong>Exhalar:</strong> 8 segundos por la boca</div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">Respiración Cuadrada</h4>
                <p className="text-sm text-muted-foreground mb-3">Perfecta para equilibrar el sistema nervioso</p>
                <div className="space-y-2 text-sm">
                  <div><strong>Inhalar:</strong> 4 segundos</div>
                  <div><strong>Retener:</strong> 4 segundos</div>
                  <div><strong>Exhalar:</strong> 4 segundos</div>
                  <div><strong>Pausa:</strong> 4 segundos</div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">Respiración Profunda</h4>
                <p className="text-sm text-muted-foreground mb-3">Para momentos de ansiedad o estrés</p>
                <div className="space-y-2 text-sm">
                  <div><strong>Inhalar:</strong> Lentamente por la nariz</div>
                  <div><strong>Expandir:</strong> Abdomen y pecho</div>
                  <div><strong>Exhalar:</strong> Lentamente por la boca</div>
                  <div><strong>Repetir:</strong> 5-10 veces</div>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">Respiración Energizante</h4>
                <p className="text-sm text-muted-foreground mb-3">Para activar y despertar el cuerpo</p>
                <div className="space-y-2 text-sm">
                  <div><strong>Inhalar:</strong> Rápido y profundo</div>
                  <div><strong>Exhalar:</strong> Rápido y completo</div>
                  <div><strong>Ritmo:</strong> Acelerado por 30 segundos</div>
                  <div><strong>Finalizar:</strong> Con respiración lenta</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* When to Practice */}
        <Card>
          <CardHeader>
            <CardTitle>Cuándo Practicar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-primary">Momentos Ideales</h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Al despertar (5 minutos de respiración energizante)</li>
                  <li>• Antes de comidas importantes</li>
                  <li>• Durante descansos de trabajo</li>
                  <li>• Antes de dormir (técnica 4-7-8)</li>
                  <li>• En momentos de estrés o ansiedad</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-primary">Consejos de Práctica</h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Encuentra un lugar tranquilo y cómodo</li>
                  <li>• Mantén una postura erguida</li>
                  <li>• Concéntrate solo en la respiración</li>
                  <li>• No fuerces, respira naturalmente</li>
                  <li>• Practica consistentemente cada día</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Tracking */}
        <Card>
          <CardHeader>
            <CardTitle>Tu Progreso en Ejercicios</CardTitle>
            <CardDescription>Registra tu práctica diaria para ver tu evolución</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Completa una sesión de ejercicios de respiración para comenzar a registrar tu progreso.
              </p>
              <p className="text-sm text-muted-foreground">
                Cada sesión completada suma puntos a tu progreso diario y semanal.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExercisesPage;