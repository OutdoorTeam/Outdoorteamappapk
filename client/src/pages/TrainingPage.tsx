import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Play } from 'lucide-react';

const TrainingPage: React.FC = () => {
  const { user } = useAuth();
  const [workoutOfDay, setWorkoutOfDay] = React.useState<any>(null);
  const [userFiles, setUserFiles] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    fetchWorkoutOfDay();
    fetchUserFiles();
  }, []);

  const fetchWorkoutOfDay = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/workout-of-day', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const workout = await response.json();
        setWorkoutOfDay(workout);
      }
    } catch (error) {
      console.error('Error fetching workout of day:', error);
    }
  };

  const fetchUserFiles = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/user-files', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const files = await response.json();
        setUserFiles(files.filter((file: any) => file.file_type === 'training'));
      }
    } catch (error) {
      console.error('Error fetching user files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando entrenamientos...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Entrenamiento</h1>
        <p className="text-muted-foreground">Tu plan de entrenamiento personalizado y rutinas diarias</p>
      </div>

      <div className="space-y-8">
        {/* Workout of the Day */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Entrenamiento del Día</CardTitle>
            <CardDescription>Rutina diaria recomendada para todos los usuarios</CardDescription>
          </CardHeader>
          <CardContent>
            {workoutOfDay ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{workoutOfDay.title}</h3>
                  <p className="text-muted-foreground mb-4">{workoutOfDay.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {JSON.parse(workoutOfDay.exercises_json || '[]').map((exercise: any, index: number) => (
                    <Card key={index} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{exercise.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{exercise.description}</p>
                        {exercise.sets && (
                          <div className="text-sm font-medium mb-3">
                            {exercise.sets} series × {exercise.reps} repeticiones
                          </div>
                        )}
                        {exercise.video_url && (
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => window.open(exercise.video_url, '_blank')}
                          >
                            <Play size={16} className="mr-2" />
                            Ver Video
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay entrenamiento programado para hoy.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personalized Training Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Tu Plan de Entrenamiento Personalizado</CardTitle>
            <CardDescription>Plan diseñado específicamente para tus objetivos y nivel</CardDescription>
          </CardHeader>
          <CardContent>
            {userFiles.length > 0 ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Aquí encontrarás tu plan de entrenamiento personalizado, diseñado por nuestros profesionales.
                </p>
                {userFiles.map((file: any) => (
                  <Card key={file.id} className="border border-primary/20">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <h4 className="font-medium">{file.filename}</h4>
                        <p className="text-sm text-muted-foreground">
                          Plan de entrenamiento personalizado
                        </p>
                      </div>
                      <Button 
                        onClick={() => window.open(`/api/files/${file.id}`, '_blank')}
                        className="ml-4"
                      >
                        Ver Plan
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Aún no tienes un plan de entrenamiento personalizado asignado.
                </p>
                <p className="text-sm text-muted-foreground">
                  Tu entrenador trabajará contigo para crear un plan adaptado a tus necesidades.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Training Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Consejos de Entrenamiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Antes del Entrenamiento</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Realiza un calentamiento de 5-10 minutos</li>
                  <li>• Mantente hidratado</li>
                  <li>• Usa ropa y calzado adecuado</li>
                  <li>• Escucha a tu cuerpo</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Después del Entrenamiento</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Realiza estiramientos de enfriamiento</li>
                  <li>• Hidrata tu cuerpo adecuadamente</li>
                  <li>• Consume proteínas dentro de 30 minutos</li>
                  <li>• Registra tu progreso</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrainingPage;