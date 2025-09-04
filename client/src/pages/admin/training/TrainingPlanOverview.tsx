import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAddOrUpdateDay } from '@/hooks/api/use-training-plan';
import { Dumbbell, Plus, Edit } from 'lucide-react';

interface TrainingPlan {
  id: number;
  title: string | null;
}

interface TrainingPlanDay {
  id: number;
  day_index: number;
  title: string | null;
  exercises?: any[];
}

interface TrainingPlanOverviewProps {
  plan: TrainingPlan;
  days: TrainingPlanDay[];
  userId: number;
  onDaySelect: (dayId: number) => void;
}

const TrainingPlanOverview: React.FC<TrainingPlanOverviewProps> = ({ plan, days, userId, onDaySelect }) => {
  const { toast } = useToast();
  const addOrUpdateDayMutation = useAddOrUpdateDay(userId);

  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const handleAddDay = async (dayIndex: number) => {
    try {
      await addOrUpdateDayMutation.mutateAsync({
        planId: plan.id,
        day_index: dayIndex,
        title: daysOfWeek[dayIndex],
        sort_order: dayIndex
      });
      toast({
        title: "Día agregado",
        description: `Se ha agregado el día ${daysOfWeek[dayIndex]} al plan`,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5" />
          Resumen del Plan: {plan.title || 'Sin título'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {daysOfWeek.map((dayName, index) => {
            const dayData = days.find(d => d.day_index === index);
            
            return (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{dayName}</h4>
                  {dayData && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {dayData.exercises?.length || 0} ejercicios
                    </span>
                  )}
                </div>
                
                {dayData ? (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      {dayData.title || 'Día de entrenamiento'}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDaySelect(dayData.id)}
                      className="w-full"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Día
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-sm text-muted-foreground mb-2">
                      Día de descanso
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddDay(index)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Entrenamiento
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrainingPlanOverview;
