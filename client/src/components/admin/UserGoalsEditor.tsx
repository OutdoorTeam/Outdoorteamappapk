import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAdminUserGoals, useUpdateAdminUserGoals } from '@/hooks/api/use-admin-user-goals';
import { Target, FootprintsIcon, Save } from 'lucide-react';

interface User {
  id: number;
  email: string;
  full_name: string;
}

interface UserGoalsEditorProps {
  user: User;
}

const UserGoalsEditor: React.FC<UserGoalsEditorProps> = ({ user }) => {
  const { toast } = useToast();
  const [dailyStepsGoal, setDailyStepsGoal] = React.useState(8000);
  const [weeklyPointsGoal, setWeeklyPointsGoal] = React.useState(28);

  const { data: userGoals, isLoading } = useAdminUserGoals(user.id);
  const updateGoalsMutation = useUpdateAdminUserGoals();

  // Update form when data loads
  React.useEffect(() => {
    if (userGoals) {
      setDailyStepsGoal(userGoals.daily_steps_goal);
      setWeeklyPointsGoal(userGoals.weekly_points_goal);
    }
  }, [userGoals]);

  const handleSaveGoals = async () => {
    if (dailyStepsGoal < 1000 || dailyStepsGoal > 50000) {
      toast({
        title: "Error",
        description: "La meta de pasos debe estar entre 1,000 y 50,000",
        variant: "destructive",
      });
      return;
    }

    if (weeklyPointsGoal < 7 || weeklyPointsGoal > 100) {
      toast({
        title: "Error",
        description: "La meta semanal debe estar entre 7 y 100 puntos",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateGoalsMutation.mutateAsync({
        userId: user.id,
        goals: {
          daily_steps_goal: dailyStepsGoal,
          weekly_points_goal: weeklyPointsGoal
        }
      });

      toast({
        title: "Metas actualizadas",
        description: "Las metas personalizadas se han actualizado correctamente",
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating user goals:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar las metas",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-sm text-muted-foreground">Cargando metas del usuario...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Metas Personalizadas para {user.full_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Daily Steps Goal */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FootprintsIcon className="w-5 h-5 text-blue-600" />
              <Label htmlFor="dailyStepsGoal" className="text-base font-medium">
                Meta Diaria de Pasos
              </Label>
            </div>
            <div className="space-y-2">
              <Input
                id="dailyStepsGoal"
                type="number"
                min="1000"
                max="50000"
                step="500"
                value={dailyStepsGoal}
                onChange={(e) => setDailyStepsGoal(parseInt(e.target.value) || 8000)}
                className="max-w-xs"
              />
              <p className="text-sm text-muted-foreground">
                Cantidad de pasos que el usuario debe completar diariamente (1,000 - 50,000)
              </p>
            </div>
          </div>

          {/* Weekly Points Goal */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              <Label htmlFor="weeklyPointsGoal" className="text-base font-medium">
                Meta Semanal de Puntos
              </Label>
            </div>
            <div className="space-y-2">
              <Input
                id="weeklyPointsGoal"
                type="number"
                min="7"
                max="100"
                step="1"
                value={weeklyPointsGoal}
                onChange={(e) => setWeeklyPointsGoal(parseInt(e.target.value) || 28)}
                className="max-w-xs"
              />
              <p className="text-sm text-muted-foreground">
                Puntos totales que el usuario debe obtener cada semana (7 - 100)
              </p>
            </div>
          </div>

          {/* Current Goals Preview */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-3">Vista Previa de Metas</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span>Pasos diarios:</span>
                <span className="font-medium text-blue-600">
                  {dailyStepsGoal.toLocaleString()} pasos
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Puntos semanales:</span>
                <span className="font-medium text-green-600">
                  {weeklyPointsGoal} puntos
                </span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleSaveGoals}
              disabled={updateGoalsMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateGoalsMutation.isPending ? 'Guardando...' : 'Guardar Metas'}
            </Button>
            
            {userGoals && (
              <div className="text-sm text-muted-foreground">
                Última actualización: {new Date(userGoals.updated_at).toLocaleString()}
              </div>
            )}
          </div>

          {/* Information */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">ℹ️ Información</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Las metas se reflejarán automáticamente en el dashboard del usuario</p>
              <p>• El progreso de pasos se muestra como porcentaje de la meta diaria</p>
              <p>• Los puntos semanales se calculan desde el domingo hasta el sábado</p>
              <p>• Los cambios son efectivos inmediatamente</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserGoalsEditor;
