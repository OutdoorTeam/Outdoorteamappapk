import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Calendar as CalendarIcon,
  Dumbbell, 
  Apple, 
  Footprints, 
  Brain,
  Trophy,
  Play,
  FileText,
  Coffee
} from 'lucide-react';

interface DailyHabit {
  training_completed: boolean;
  nutrition_completed: boolean;
  movement_completed: boolean;
  meditation_completed: boolean;
  steps: number;
  daily_points: number;
}

interface ContentItem {
  id: number;
  title: string;
  description: string;
  video_url: string;
  category: string;
  subcategory: string;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [todayHabits, setTodayHabits] = React.useState<DailyHabit>({
    training_completed: false,
    nutrition_completed: false,
    movement_completed: false,
    meditation_completed: false,
    steps: 0,
    daily_points: 0
  });
  const [weeklyPoints, setWeeklyPoints] = React.useState(0);
  const [stepsInput, setStepsInput] = React.useState('');
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [calendarData, setCalendarData] = React.useState<{[key: string]: number}>({});
  const [exerciseVideos, setExerciseVideos] = React.useState<ContentItem[]>([]);
  const [meditationVideos, setMeditationVideos] = React.useState<ContentItem[]>([]);
  const [activeBreaksVideos, setActiveBreaksVideos] = React.useState<ContentItem[]>([]);
  const [personalizedFiles, setPersonalizedFiles] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const today = new Date().toISOString().split('T')[0];

  React.useEffect(() => {
    fetchDashboardData();
    fetchContentLibrary();
    fetchPersonalizedFiles();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      // Fetch today's habits
      const todayResponse = await fetch(`/api/daily-habits/today`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (todayResponse.ok) {
        const todayData = await todayResponse.json();
        setTodayHabits({
          training_completed: Boolean(todayData.training_completed),
          nutrition_completed: Boolean(todayData.nutrition_completed),
          movement_completed: Boolean(todayData.movement_completed),
          meditation_completed: Boolean(todayData.meditation_completed),
          steps: todayData.steps || 0,
          daily_points: todayData.daily_points || 0
        });
        if (todayData.steps) {
          setStepsInput(todayData.steps.toString());
        }
      }

      // Fetch weekly points
      const weeklyResponse = await fetch(`/api/daily-habits/weekly-points`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (weeklyResponse.ok) {
        const weeklyData = await weeklyResponse.json();
        setWeeklyPoints(weeklyData.total_points || 0);
      }

      // Fetch calendar data
      const calendarResponse = await fetch(`/api/daily-habits/calendar`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        const calendarMap: {[key: string]: number} = {};
        calendarData.forEach((day: any) => {
          calendarMap[day.date] = day.daily_points;
        });
        setCalendarData(calendarMap);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContentLibrary = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/content-library', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const content = await response.json();
        setExerciseVideos(content.filter((item: ContentItem) => item.category === 'exercise'));
        setMeditationVideos(content.filter((item: ContentItem) => item.category === 'meditation'));
        setActiveBreaksVideos(content.filter((item: ContentItem) => item.category === 'active_breaks'));
      }
    } catch (error) {
      console.error('Error fetching content library:', error);
    }
  };

  const fetchPersonalizedFiles = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/user-files', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const files = await response.json();
        setPersonalizedFiles(files);
      }
    } catch (error) {
      console.error('Error fetching personalized files:', error);
    }
  };

  const updateHabit = async (habitType: string, completed: boolean) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/daily-habits/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: today,
          [habitType]: completed
        })
      });

      if (response.ok) {
        const updatedData = await response.json();
        setTodayHabits(prev => ({
          ...prev,
          [habitType]: completed,
          daily_points: updatedData.daily_points
        }));
        
        // Update calendar data
        setCalendarData(prev => ({
          ...prev,
          [today]: updatedData.daily_points
        }));

        // Refresh weekly points
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error updating habit:', error);
    }
  };

  const updateSteps = async () => {
    if (!stepsInput.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const steps = parseInt(stepsInput);
      
      const response = await fetch('/api/daily-habits/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: today,
          steps: steps,
          movement_completed: steps >= 10000
        })
      });

      if (response.ok) {
        const updatedData = await response.json();
        setTodayHabits(prev => ({
          ...prev,
          steps: steps,
          movement_completed: steps >= 10000,
          daily_points: updatedData.daily_points
        }));
        
        setCalendarData(prev => ({
          ...prev,
          [today]: updatedData.daily_points
        }));

        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error updating steps:', error);
    }
  };

  const getCalendarDayProps = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const points = calendarData[dateStr];
    
    if (points >= 2) {
      return { className: 'bg-green-500 text-white hover:bg-green-600' };
    } else if (points === 1) {
      return { className: 'bg-orange-400 text-white hover:bg-orange-500' };
    }
    return {};
  };

  const habits = [
    {
      key: 'training_completed' as const,
      name: 'Entrenamiento',
      icon: Dumbbell,
      completed: todayHabits.training_completed,
      color: 'text-blue-600'
    },
    {
      key: 'nutrition_completed' as const,
      name: 'Nutrición',
      icon: Apple,
      completed: todayHabits.nutrition_completed,
      color: 'text-green-600'
    },
    {
      key: 'movement_completed' as const,
      name: 'Movimiento (10k pasos)',
      icon: Footprints,
      completed: todayHabits.movement_completed,
      color: 'text-purple-600'
    },
    {
      key: 'meditation_completed' as const,
      name: 'Meditación',
      icon: Brain,
      completed: todayHabits.meditation_completed,
      color: 'text-indigo-600'
    }
  ];

  const trainingPlan = personalizedFiles.find(f => f.file_type === 'training_plan');
  const nutritionPlan = personalizedFiles.find(f => f.file_type === 'nutrition_plan');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando tu panel...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-brand-black">
          ¡Bienvenido, {user?.full_name.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground">Tu progreso diario te acerca a tus metas</p>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Today's Habits */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-brand-gold" />
              Hábitos de Hoy
            </CardTitle>
            <CardDescription>
              {todayHabits.daily_points} puntos ganados hoy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {habits.map((habit) => {
                const Icon = habit.icon;
                return (
                  <div key={habit.key} className="flex items-center space-x-3 p-3 rounded-lg border">
                    <Checkbox
                      id={habit.key}
                      checked={habit.completed}
                      onCheckedChange={(checked) => updateHabit(habit.key, Boolean(checked))}
                    />
                    <Icon className={`h-5 w-5 ${habit.color}`} />
                    <Label 
                      htmlFor={habit.key}
                      className={`flex-1 cursor-pointer ${habit.completed ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {habit.name}
                    </Label>
                  </div>
                );
              })}
            </div>

            {/* Steps Counter */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Footprints className="h-5 w-5 text-purple-600" />
                <Label className="font-medium">Contador de Pasos</Label>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Ingresa tus pasos de hoy"
                  value={stepsInput}
                  onChange={(e) => setStepsInput(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={updateSteps} className="bg-brand-gold hover:bg-brand-gold/90 text-brand-black">
                  Actualizar
                </Button>
              </div>
              {todayHabits.steps > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {todayHabits.steps.toLocaleString()} pasos registrados
                  {todayHabits.steps >= 10000 && ' ✅'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Progress & Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-brand-gold" />
              Progreso Semanal
            </CardTitle>
            <CardDescription>
              {weeklyPoints} puntos esta semana
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center p-4 bg-brand-gold/10 rounded-lg">
                <div className="text-2xl font-bold text-brand-black">{weeklyPoints}</div>
                <div className="text-sm text-muted-foreground">Puntos Totales</div>
              </div>
              
              <div className="text-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                  modifiers={{
                    high: (date) => {
                      const dateStr = date.toISOString().split('T')[0];
                      return (calendarData[dateStr] || 0) >= 2;
                    },
                    medium: (date) => {
                      const dateStr = date.toISOString().split('T')[0];
                      return (calendarData[dateStr] || 0) === 1;
                    }
                  }}
                  modifiersStyles={{
                    high: { backgroundColor: '#22c55e', color: 'white' },
                    medium: { backgroundColor: '#f97316', color: 'white' }
                  }}
                />
              </div>
              
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>2+ hábitos (2+ puntos)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-400 rounded"></div>
                  <span>1 hábito (1 punto)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="training" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="training">Entrenamiento</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrición</TabsTrigger>
          <TabsTrigger value="exercises">Ejercicios</TabsTrigger>
          <TabsTrigger value="meditation">Meditación</TabsTrigger>
          <TabsTrigger value="breaks" className="hidden lg:inline-flex">Pausas Activas</TabsTrigger>
          <TabsTrigger value="files" className="hidden lg:inline-flex">Mis Archivos</TabsTrigger>
        </TabsList>

        {/* Training Plan */}
        <TabsContent value="training">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Plan de Entrenamiento Personalizado
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trainingPlan ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 border rounded-lg">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div className="flex-1">
                      <h3 className="font-medium">{trainingPlan.filename}</h3>
                      <p className="text-sm text-muted-foreground">
                        Subido el {new Date(trainingPlan.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="outline">Ver PDF</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Tu plan de entrenamiento personalizado aparecerá aquí una vez que sea asignado.</p>
                  <p className="text-sm mt-2">Contacta a tu entrenador para obtener tu plan.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Nutrition Plan */}
        <TabsContent value="nutrition">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Apple className="h-5 w-5" />
                Plan Nutricional Personalizado
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nutritionPlan ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 border rounded-lg">
                    <FileText className="h-8 w-8 text-green-600" />
                    <div className="flex-1">
                      <h3 className="font-medium">{nutritionPlan.filename}</h3>
                      <p className="text-sm text-muted-foreground">
                        Subido el {new Date(nutritionPlan.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="outline">Ver PDF</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Apple className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Tu plan nutricional personalizado aparecerá aquí una vez que sea asignado.</p>
                  <p className="text-sm mt-2">Mejora a Premium para nutrición personalizada por Lic. Ana Saloco.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exercise Videos */}
        <TabsContent value="exercises">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Biblioteca de Ejercicios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exerciseVideos.map((video) => (
                  <div key={video.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                      <Play className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-2">{video.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{video.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {video.subcategory}
                      </span>
                      <Button size="sm" variant="outline">Ver Video</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Meditation */}
        <TabsContent value="meditation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Meditación y Mindfulness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {meditationVideos.map((video) => (
                  <div key={video.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                      <Brain className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-2">{video.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{video.description}</p>
                    <Button size="sm" className="w-full">Comenzar Sesión</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Breaks */}
        <TabsContent value="breaks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coffee className="h-5 w-5" />
                Pausas Activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeBreaksVideos.map((video) => (
                  <div key={video.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                      <Coffee className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-2">{video.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{video.description}</p>
                    <Button size="sm" variant="outline" className="w-full">Ver Ejercicio</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files */}
        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Mis Archivos Personalizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {personalizedFiles.length > 0 ? (
                <div className="space-y-3">
                  {personalizedFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                      <div className="flex-1">
                        <h3 className="font-medium">{file.filename}</h3>
                        <p className="text-sm text-muted-foreground">
                          {file.file_type === 'training_plan' ? 'Plan de Entrenamiento' : 
                           file.file_type === 'nutrition_plan' ? 'Plan Nutricional' : 
                           'Archivo Personalizado'}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">Ver</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Tus archivos personalizados aparecerán aquí.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardPage;
