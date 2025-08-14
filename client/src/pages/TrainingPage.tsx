import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Play, Calendar, User, FileText, Clock } from 'lucide-react';
import { useWorkoutOfDay } from '@/hooks/api/use-workout';
import { useUserFiles } from '@/hooks/api/use-user-files';

const TrainingPage: React.FC = () => {
  const { user } = useAuth();
  
  // Use React Query hooks
  const { data: workoutOfDay, isLoading: workoutLoading } = useWorkoutOfDay();
  const { data: userFiles = [], isLoading: filesLoading } = useUserFiles('training');

  const isLoading = workoutLoading || filesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando área de entrenamiento...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Área de Entrenamiento</h1>
        <p className="text-muted-foreground">Tu espacio completo para entrenar y alcanzar tus objetivos</p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Training of the Day - Common for all users */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <CardTitle className="text-primary">Entrenamiento del Día</CardTitle>
            </div>
            <CardDescription>Rutina diaria diseñada para todos los usuarios de Outdoor Team</CardDescription>
          </CardHeader>
          <CardContent>
            {workoutOfDay ? (
              <div className="space-y-6">
                <div className="bg-primary/5 p-4 rounded-lg">
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    {workoutOfDay.title}
                  </h3>
                  <p className="text-muted-foreground mb-4">{workoutOfDay.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(workoutOfDay.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {JSON.parse(workoutOfDay.exercises_json || '[]').map((exercise: any, index: number) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                          {exercise.name}
                          <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                            #{index + 1}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{exercise.description}</p>
                        {exercise.sets && exercise.reps && (
                          <div className="text-sm font-medium mb-3 bg-gray-50 p-2 rounded">
                            <strong>{exercise.sets}</strong> series × <strong>{exercise.reps}</strong> repeticiones
                          </div>
                        )}
                        {exercise.duration && (
                          <div className="text-sm font-medium mb-3 bg-blue-50 p-2 rounded text-blue-700">
                            Duración: <strong>{exercise.duration}</strong>
                          </div>
                        )}
                        {exercise.video_url && (
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => window.open(exercise.video_url, '_blank')}
                          >
                            <Play size={16} className="mr-2" />
                            Ver Video Instructivo
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {JSON.parse(workoutOfDay.exercises_json || '[]').length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Los ejercicios específicos se cargarán pronto. ¡Mantente activo!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No hay entrenamiento programado</h3>
                <p className="text-muted-foreground">
                  El entrenamiento del día se actualizará pronto. ¡Vuelve más tarde!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Personalized Training Plan */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-blue-500">Tu Plan de Entrenamiento Personalizado</CardTitle>
            </div>
            <CardDescription>
              Plan diseñado específicamente para tus objetivos, nivel y disponibilidad
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userFiles.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Plan Personalizado Disponible</h4>
                  <p className="text-blue-700 text-sm mb-3">
                    Tu entrenador ha creado un plan específico basado en tu evaluación inicial, 
                    objetivos y disponibilidad de tiempo.
                  </p>
                </div>
                
                {userFiles.map((file: any) => (
                  <Card key={file.id} className="border-2 border-blue-200 hover:border-blue-300 transition-colors">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-lg">{file.filename}</h4>
                          <p className="text-sm text-muted-foreground">
                            Plan de entrenamiento personalizado
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Creado: {new Date(file.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => window.open(`/api/files/${file.id}`, '_blank')}
                        className="ml-4 bg-blue-600 hover:bg-blue-700"
                      >
                        <FileText size={16} className="mr-2" />
                        Abrir Plan
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">💡 Consejos para tu Plan</h4>
                  <ul className="text-yellow-700 text-sm space-y-1">
                    <li>• Sigue las progresiones sugeridas semana a semana</li>
                    <li>• Registra tus pesos y repeticiones para monitorear el progreso</li>
                    <li>• Consulta con tu entrenador si tienes dudas sobre algún ejercicio</li>
                    <li>• Respeta los días de descanso programados</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">Plan Personalizado en Proceso</h3>
                <p className="text-muted-foreground mb-4">
                  Tu entrenador está trabajando en crear un plan específico para ti.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
                  <h4 className="font-medium mb-2">¿Qué incluirá tu plan?</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Rutinas adaptadas a tu nivel actual</li>
                    <li>• Progresión semana a semana</li>
                    <li>• Ejercicios para casa o gimnasio</li>
                    <li>• Instrucciones detalladas y consejos</li>
                    <li>• Plan de seguimiento personalizado</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Training Tips and Guidelines */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Antes del Entrenamiento</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Realiza un calentamiento de 5-10 minutos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Mantente bien hidratado antes, durante y después</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Usa ropa cómoda y calzado adecuado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Asegúrate de tener suficiente espacio para ejercitarte</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-blue-600">Después del Entrenamiento</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span>Realiza estiramientos de enfriamiento</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span>Rehidrata tu cuerpo adecuadamente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span>Consume proteínas dentro de 30 minutos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">✓</span>
                  <span>Registra tu progreso y cómo te sentiste</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TrainingPage;
