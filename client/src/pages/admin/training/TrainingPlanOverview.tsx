import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAddOrUpdateDay } from '@/hooks/api/use-training-plan';
import type { TrainingPlan, TrainingPlanDay } from '@/hooks/api/use-training-plan';
import { Plus, Calendar, Edit, Dumbbell } from 'lucide-react';

interface TrainingPlanOverviewProps {
  plan: TrainingPlan;
  days: TrainingPlanDay[];
  userId: number;
  onDaySelect: (dayId: number) => void;
}

export const TrainingPlanOverview: React.FC<TrainingPlanOverviewProps> = ({
  plan,
  days,
  userId,
  onDaySelect,
}) => {
  const { toast } = useToast();
  const addOrUpdateDayMutation = useAddOrUpdateDay(userId);

  const handleAddDay = async () => {
    const nextDayIndex = Math.max(0, ...days.map(d => d.day_index)) + 1;
    
    try {
      await addOrUpdateDayMutation.mutateAsync({
        planId: plan.id,
        day_index: nextDayIndex,
        title: `Día ${nextDayIndex}`,
        notes: '',
        sort_order: nextDayIndex - 1
      });

      toast({
        title: "Día agregado",
        description: `Se ha agregado el día ${nextDayIndex} al plan`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error adding day:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el día",
        variant: "destructive",
      });
    }
  };

  const getDayIntensityColor = (exercises: any[]) => {
    const intensities = exercises.map(e => e.intensity).filter(Boolean);
    if (intensities.includes('alta') || intensities.includes('RPE9') || intensities.includes('RPE10')) {
      return 'bg-red-100 border-red-200 text-red-800';
    }
    if (intensities.includes('media') || intensities.includes('RPE7') || intensities.includes('RPE8')) {
      return 'bg-yellow-100 border-yellow-200 text-yellow-800';
    }
    return 'bg-green-100 border-green-200 text-green-800';
  };

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5" />
            {plan.title || 'Plan de Entrenamiento'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={plan.status === 'published' ? 'default' : 'secondary'}>
              {plan.status === 'published' ? 'Publicado' : 'Borrador'}
            </Badge>
            <Badge variant="outline">Versión {plan.version}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Creado: {new Date(plan.created_at).toLocaleDateString()}</p>
            <p>Última actualización: {new Date(plan.updated_at).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Days Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Días del Plan ({days.length})
            </CardTitle>
            <Button onClick={handleAddDay} disabled={addOrUpdateDayMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              {addOrUpdateDayMutation.isPending ? 'Agregando...' : 'Agregar Día'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {days.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {days
                .sort((a, b) => a.day_index - b.day_index)
                .map((day) => (
                  <Card 
                    key={day.id} 
                    className={`cursor-pointer transition-colors hover:shadow-md ${getDayIntensityColor(day.exercises ?? [])}`}
                    onClick={() => onDaySelect(day.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{day.title || `Día ${day.day_index}`}</h3>
                        <Badge variant="secondary" className="bg-white/50">
                          {(day.exercises ?? []).length} ejercicios
                        </Badge>
                      </div>
                      
                      {day.notes && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {day.notes}
                        </p>
                      )}

                      <div className="space-y-2">
                        {(day.exercises ?? []).slice(0, 3).map((exercise, index) => (
                          <div key={exercise.id} className="text-sm">
                            <span className="font-medium">{exercise.exercise_name}</span>
                            {exercise.sets && exercise.reps && (
                              <span className="text-gray-600 ml-2">
                                {exercise.sets}×{exercise.reps}
                              </span>
                            )}
                            {exercise.intensity && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {exercise.intensity}
                              </Badge>
                            )}
                          </div>
                        ))}
                        
                        {(day.exercises ?? []).length > 3 && (
                          <p className="text-xs text-gray-500">
                            +{(day.exercises ?? []).length - 3} ejercicios más
                          </p>
                        )}
                        
                        {(day.exercises ?? []).length === 0 && (
                          <p className="text-sm text-gray-500 italic">
                            Sin ejercicios asignados
                          </p>
                        )}
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDaySelect(day.id);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar Día
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                No hay días en este plan
              </h3>
              <p className="text-muted-foreground mb-4">
                Comienza agregando días al plan de entrenamiento
              </p>
              <Button onClick={handleAddDay} disabled={addOrUpdateDayMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primer Día
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainingPlanOverview;
