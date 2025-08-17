import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, Dumbbell, CheckCircle } from 'lucide-react';
import { useUpdateTrainingPlan, usePublishTrainingPlan } from '@/hooks/api/use-training-plan';
import { useToast } from '@/hooks/use-toast';

interface TrainingPlanOverviewProps {
  plan: any;
  days: any[];
  userId: number;
  legacyPdf?: any;
}

export const TrainingPlanOverview: React.FC<TrainingPlanOverviewProps> = ({
  plan,
  days,
  userId,
  legacyPdf
}) => {
  const { toast } = useToast();
  const updatePlanMutation = useUpdateTrainingPlan(userId);
  const publishMutation = usePublishTrainingPlan(userId);

  const handlePublish = async () => {
    if (!plan) return;

    const totalExercises = days.reduce((sum, day) => sum + (day.exercises?.length || 0), 0);
    
    if (totalExercises === 0) {
      toast({
        title: "No se puede publicar",
        description: "El plan debe tener al menos un ejercicio",
        variant: "destructive",
      });
      return;
    }

    try {
      await publishMutation.mutateAsync(plan.id);
      toast({
        title: "Plan publicado",
        description: "El plan de entrenamiento está ahora disponible para el usuario",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo publicar el plan",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800">Publicado</Badge>;
      case 'draft':
        return <Badge variant="secondary">Borrador</Badge>;
      default:
        return null;
    }
  };

  const totalExercises = days.reduce((sum, day) => sum + (day.exercises?.length || 0), 0);
  const daysWithExercises = days.filter(day => day.exercises && day.exercises.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Plan Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5" />
              Resumen del Plan
            </CardTitle>
            <div className="flex items-center gap-3">
              {getStatusBadge(plan.status)}
              <Badge variant="outline">v{plan.version}</Badge>
              {plan.status === 'draft' && (
                <Button 
                  onClick={handlePublish}
                  disabled={publishMutation.isPending || totalExercises === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Publicar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{days.length}</div>
              <div className="text-sm text-muted-foreground">Días configurados</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{daysWithExercises}</div>
              <div className="text-sm text-muted-foreground">Días con ejercicios</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{totalExercises}</div>
              <div className="text-sm text-muted-foreground">Total ejercicios</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{plan.version}</div>
              <div className="text-sm text-muted-foreground">Versión actual</div>
            </div>
          </div>

          <div className="space-y-2">
            <p><strong>Título:</strong> {plan.title}</p>
            <p><strong>Estado:</strong> {plan.status === 'published' ? 'Publicado' : 'Borrador'}</p>
            <p><strong>Creado:</strong> {new Date(plan.created_at).toLocaleDateString()}</p>
            <p><strong>Última actualización:</strong> {new Date(plan.updated_at).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Days Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Vista por Días
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {days.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay días configurados
              </p>
            ) : (
              days.map((day) => (
                <div key={day.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">{day.title || `Día ${day.day_index}`}</h3>
                    <Badge variant="outline">
                      {day.exercises?.length || 0} ejercicios
                    </Badge>
                  </div>
                  
                  {day.notes && (
                    <p className="text-sm text-muted-foreground mb-3">{day.notes}</p>
                  )}

                  {day.exercises && day.exercises.length > 0 ? (
                    <div className="space-y-2">
                      {day.exercises.map((exercise: any, index: number) => (
                        <div key={exercise.id} className="flex items-center justify-between text-sm bg-muted/50 rounded p-2">
                          <div>
                            <span className="font-medium">{exercise.exercise_name}</span>
                            {(exercise.sets || exercise.reps) && (
                              <span className="text-muted-foreground ml-2">
                                {exercise.sets && `${exercise.sets} series`}
                                {exercise.sets && exercise.reps && ' × '}
                                {exercise.reps && `${exercise.reps} reps`}
                              </span>
                            )}
                          </div>
                          {exercise.intensity && (
                            <Badge variant="secondary" className="text-xs">
                              {exercise.intensity}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Sin ejercicios</p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legacy PDF */}
      {legacyPdf && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              PDF Legacy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
              <FileText className="w-8 h-8 text-red-600" />
              <div className="flex-1">
                <p className="font-medium text-sm">{legacyPdf.filename}</p>
                <p className="text-xs text-muted-foreground">
                  Subido el {new Date(legacyPdf.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Este PDF se muestra como fallback cuando no hay plan estructurado
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
