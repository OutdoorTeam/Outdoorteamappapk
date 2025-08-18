import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  useUserPermissions, 
  useUpdateUserPermissions,
  useUserGoals,
  useUpdateUserGoals,
  useUserTodayHabits,
  useUserStepHistory
} from '@/hooks/api/use-user-management';
import { useUserStats } from '@/hooks/api/use-user-stats';
import UserTrainingPlanEditor from './UserTrainingPlanEditor';
import WeeklyPointsChart from '@/components/profile/WeeklyPointsChart';
import MonthlyHabitsChart from '@/components/profile/MonthlyHabitsChart';
import HabitCompletionDonut from '@/components/profile/HabitCompletionDonut';
import StatsSummary from '@/components/profile/StatsSummary';
import { 
  User, 
  Settings, 
  Target, 
  Activity, 
  BarChart3, 
  Calendar,
  CheckCircle,
  XCircle,
  Footprints,
  Dumbbell,
  Apple,
  Brain,
  Coffee,
  Crown,
  Gauge
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  plan_type: string | null;
  is_active: boolean;
  features: {
    habits: boolean;
    training: boolean;
    nutrition: boolean;
    meditation: boolean;
    active_breaks: boolean;
  };
  created_at: string;
}

interface UserDetailPanelProps {
  user: User;
  onClose: () => void;
}

const UserDetailPanel: React.FC<UserDetailPanelProps> = ({ user, onClose }) => {
  const { toast } = useToast();

  // API hooks
  const { data: permissions, isLoading: permissionsLoading } = useUserPermissions(user.id);
  const { data: goals, isLoading: goalsLoading } = useUserGoals(user.id);
  const { data: todayHabits, isLoading: habitsLoading } = useUserTodayHabits(user.id);
  const { data: stepHistory, isLoading: stepHistoryLoading } = useUserStepHistory(user.id, 30);
  const { data: userStats, isLoading: statsLoading } = useUserStats(user.id);
  
  // Mutations
  const updatePermissionsMutation = useUpdateUserPermissions();
  const updateGoalsMutation = useUpdateUserGoals();

  // Local state for forms
  const [stepGoal, setStepGoal] = React.useState(8000);
  const [weeklyGoal, setWeeklyGoal] = React.useState(28);

  // Initialize form values when data loads
  React.useEffect(() => {
    if (goals) {
      setStepGoal(goals.daily_steps_goal);
      setWeeklyGoal(goals.weekly_points_goal);
    }
  }, [goals]);

  const handlePermissionToggle = async (permission: string, enabled: boolean) => {
    try {
      await updatePermissionsMutation.mutateAsync({
        userId: user.id,
        permissions: {
          [permission]: enabled
        }
      });
      
      toast({
        title: "Permisos actualizados",
        description: `${permission} ${enabled ? 'activado' : 'desactivado'} para ${user.full_name}`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los permisos",
        variant: "destructive",
      });
    }
  };

  const handleGoalUpdate = async () => {
    try {
      await updateGoalsMutation.mutateAsync({
        userId: user.id,
        goals: {
          daily_steps_goal: stepGoal,
          weekly_points_goal: weeklyGoal
        }
      });
      
      toast({
        title: "Metas actualizadas",
        description: `Metas de ${user.full_name} actualizadas correctamente`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar las metas",
        variant: "destructive",
      });
    }
  };

  const getHabitIcon = (habitType: string) => {
    switch (habitType) {
      case 'training':
        return <Dumbbell className="w-5 h-5 text-blue-600" />;
      case 'nutrition':
        return <Apple className="w-5 h-5 text-green-600" />;
      case 'movement':
        return <Footprints className="w-5 h-5 text-purple-600" />;
      case 'meditation':
        return <Brain className="w-5 h-5 text-orange-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getHabitName = (habitType: string) => {
    switch (habitType) {
      case 'training':
        return 'Entrenamiento';
      case 'nutrition':
        return 'Nutrición';
      case 'movement':
        return 'Pasos/Movimiento';
      case 'meditation':
        return 'Meditación';
      default:
        return habitType;
    }
  };

  const formatStepHistory = () => {
    if (!stepHistory) return [];
    
    return stepHistory.slice(0, 7).reverse().map(day => ({
      date: day.date,
      steps: day.steps,
      completed: day.movement_completed,
      points: day.daily_points
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                user.role === 'admin' ? 'bg-yellow-100' : 'bg-blue-100'
              }`}>
                {user.role === 'admin' ? (
                  <Crown className="w-6 h-6 text-yellow-600" />
                ) : (
                  <User className="w-6 h-6 text-blue-600" />
                )}
              </div>
              
              <div>
                <h2 className="text-2xl font-bold">{user.full_name}</h2>
                <p className="text-gray-600">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                  </Badge>
                  <Badge variant={user.is_active ? 'default' : 'destructive'}>
                    {user.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                  {user.plan_type && (
                    <Badge variant="outline">
                      {user.plan_type}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="permissions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Permisos
              </TabsTrigger>
              <TabsTrigger value="goals" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Metas
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Actividad
              </TabsTrigger>
              <TabsTrigger value="training" className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4" />
                Plan de Entrenamiento
              </TabsTrigger>
              <TabsTrigger value="statistics" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Estadísticas
              </TabsTrigger>
            </TabsList>

            {/* Permissions Tab */}
            <TabsContent value="permissions">
              <Card>
                <CardHeader>
                  <CardTitle>Permisos de Módulos</CardTitle>
                  <CardDescription>
                    Controla qué secciones puede ver y usar este usuario
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {permissionsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-sm text-muted-foreground">Cargando permisos...</p>
                    </div>
                  ) : permissions ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { key: 'dashboard_enabled', name: 'Dashboard', icon: Activity, color: 'text-blue-600' },
                        { key: 'training_enabled', name: 'Entrenamiento', icon: Dumbbell, color: 'text-red-600' },
                        { key: 'nutrition_enabled', name: 'Nutrición', icon: Apple, color: 'text-green-600' },
                        { key: 'meditation_enabled', name: 'Meditación', icon: Brain, color: 'text-purple-600' },
                        { key: 'active_breaks_enabled', name: 'Pausas Activas', icon: Coffee, color: 'text-orange-600' },
                        { key: 'exercises_enabled', name: 'Ejercicios', icon: Gauge, color: 'text-pink-600' },
                      ].map(({ key, name, icon: Icon, color }) => (
                        <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Icon className={`w-5 h-5 ${color}`} />
                            <div>
                              <Label className="text-base font-medium">{name}</Label>
                              <p className="text-sm text-muted-foreground">
                                Acceso a la sección {name.toLowerCase()}
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={Boolean(permissions[key as keyof typeof permissions])}
                            onCheckedChange={(checked) => handlePermissionToggle(key, checked)}
                            disabled={updatePermissionsMutation.isPending}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">Error al cargar permisos</p>
                  )}
                </CardContent>
              </Card>
            