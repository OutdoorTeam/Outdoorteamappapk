import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, Check, Activity, Target, Apple, Brain, Coffee, Calendar, Dumbbell } from 'lucide-react';
import MeditationSession from '@/components/MeditationSession';

interface DailyHabit {
  training_completed: boolean;
  nutrition_completed: boolean;
  movement_completed: boolean;
  meditation_completed: boolean;
  steps: number;
  daily_points: number;
}

interface UserPlan {
  name: string;
  step_goal: number;
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
  const [dailyNote, setDailyNote] = React.useState('');
  const [userPlan] = React.useState<UserPlan>({
    name: user?.plan_type || 'Programa Totum',
    step_goal: 8000
  });
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [calendarData, setCalendarData] = React.useState<{[key: string]: number}>({});
  const [contentLibrary, setContentLibrary] = React.useState([]);
  const [workoutOfDay, setWorkoutOfDay] = React.useState<any>(null);
  const [userFiles, setUserFiles] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('dashboard');

  const today = new Date().toISOString().split('T')[0];

  // Determine available tabs based on user features and role
  const getAvailableTabs = () => {
    if (!user) return [];

    const tabs = [];
    
    // Dashboard is always available for regular users, not for admin
    if (user.role === 'user') {
      tabs.push({
        id: 'dashboard',
        label: 'Dashboard',
        icon: Target
      });
    }
    
    if (user.features.training) {
      tabs.push({
        id: 'training',
        label: 'Entrenamientos',
        icon: Activity
      });
    }
    
    if (user.features.nutrition) {
      tabs.push({
        id: 'nutrition',
        label: 'Nutrición',
        icon: Apple
      });
    }
    
    if (user.features.active_breaks) {
      tabs.push({
        id: 'active_breaks',
        label: 'Pausas Activas',
        icon: Coffee
      });
    }
    
    if (user.features.meditation) {
      tabs.push({
        id: 'meditation',
        label: 'Meditación',
        icon: Brain
      });
    }

    // Plans tab is always available
    tabs.push({
      id: 'plans',
      label: 'Planes',
      icon: Calendar
    });
    
    return tabs;
  };

  const availableTabs = getAvailableTabs();

  React.useEffect(() => {
    // Set the first available tab as active if current tab is not available
    if (availableTabs.length > 0 && !availableTabs.find(tab => tab.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  React.useEffect(() => {
    if (user?.role === 'user') {
      fetchDashboardData();
      fetchDailyNote();
      fetchUserFiles();
    }
    fetchContentLibrary();
    fetchWorkoutOfDay();
  }, [user]);

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

  const fetchDailyNote = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/daily-notes/today`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const noteData = await response.json();
        setDailyNote(noteData.content || '');
      }
    } catch (error) {
      console.error('Error fetching daily note:', error);
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
        setContentLibrary(content);
      }
    } catch (error) {
      console.error('Error fetching content library:', error);
    }
  };

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
        setUserFiles(files);
      }
    } catch (error) {
      console.error('Error fetching user files:', error);
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

        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error updating habit:', error);
    }
  };

  const adjustSteps = async (adjustment: number) => {
    const newSteps = Math.max(0, todayHabits.steps + adjustment);
    
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
          steps: newSteps,
          movement_completed: newSteps >= userPlan.step_goal
        })
      });

      if (response.ok) {
        const updatedData = await response.json();
        setTodayHabits(prev => ({
          ...prev,
          steps: newSteps,
          movement_completed: newSteps >= userPlan.step_goal,
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

  const saveNote = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/daily-notes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: dailyNote,
          date: today
        })
      });

      if (response.ok) {
        console.log('Note saved successfully');
      }
    } catch (error) {
      console.error('Error saving note:', error);
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

      // Update meditation habit
      await updateHabit('meditation_completed', true);
      
      alert('¡Meditación completada! Se agregó 1 punto a tu progreso diario.');
    } catch (error) {
      console.error('Error completing meditation:', error);
    }
  };

  const getHabitsForUser = () => {
    const habits = [];

    if (user?.features.training) {
      habits.push({
        key: 'training_completed' as const,
        name: 'Ejercicio',
        description: 'Completaste tu rutina de entrenamiento',
        completed: todayHabits.training_completed
      });
    }

    // Always include movement/steps if user has habits enabled
    if (user?.role === 'user') {
      habits.push({
        key: 'movement_completed' as const,
        name: 'Pasos diarios',
        description: `Alcanzaste tu meta de ${userPlan.step_goal.toLocaleString()} pasos`,
        completed: todayHabits.movement_completed
      });
    }

    if (user?.features.nutrition) {
      habits.push({
        key: 'nutrition_completed' as const,
        name: 'Alimentación',
        description: 'Seguiste tu plan nutricional',
        completed: todayHabits.nutrition_completed
      });
    }

    if (user?.features.meditation) {
      habits.push({
        key: 'meditation_completed' as const,
        name: 'Meditación',
        description: 'Realizaste ejercicios de respiración o meditación',
        completed: todayHabits.meditation_completed
      });
    }

    return habits;
  };

  const habits = getHabitsForUser();
  const completedHabitsCount = habits.filter(h => h.completed).length;
  const stepProgress = Math.min((todayHabits.steps / userPlan.step_goal) * 100, 100);

  // Calendar helpers
  const generateCalendarDays = () => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const points = calendarData[dateStr] || 0;
      const isCurrentMonth = currentDate.getMonth() === currentMonth.getMonth();
      const isToday = dateStr === today;
      
      days.push({
        date: new Date(currentDate),
        dateStr,
        points,
        isCurrentMonth,
        isToday
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const navigateMonth = (direction: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const getContentByCategory = (category: string) => {
    return contentLibrary.filter((content: any) => content.category === category);
  };

  const getPlans = () => [
    {
      id: 1,
      name: 'Healthy Habits Academy',
      description: 'Perfecto para comenzar tu viaje saludable',
      services: [
        'Rutina de entrenamiento semanal',
        'Sistema de seguimiento de hábitos',
        'Contador de pasos (entrada manual)',
        'Notas diarias',
        'Seguimiento de progreso',
        'Videos de pausas activas'
      ]
    },
    {
      id: 2,
      name: 'Programa Totum',
      description: 'Transformación completa del bienestar',
      services: [
        'Plan de entrenamiento personalizado',
        'Plan de nutrición personalizado',
        'Seguimiento semanal por WhatsApp',
        'Acceso a biblioteca completa',
        'Pausas activas con orientación',
        'Programa completo de transformación'
      ]
    },
    {
      id: 3,
      name: 'Plan de Entrenamiento Personalizado',
      description: 'Entrenamiento diseñado específicamente para ti',
      services: [
        'Plan personalizado por profesional',
        'Entrenamiento gimnasio/hogar',
        'Más de 150 videos de ejercicios',
        'Seguimiento de progreso',
        'Ajustes según evolución',
        'Soporte técnico'
      ]
    }
  ];

  if (isLoading && user?.role === 'user') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-lg text-white">Cargando tu panel...</div>
      </div>
    );
  }

  // Check if user needs to select a plan
  if (user?.role === 'user' && (!user?.plan_type || Object.values(user.features).every(f => !f))) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center text-white p-8">
          <h1 className="text-2xl font-bold mb-4">¡Bienvenido!</h1>
          <p className="mb-4">Necesitas seleccionar un plan para continuar.</p>
          <Button onClick={() => window.location.href = '/plan-selection'}>
            Seleccionar Plan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-bg min-h-screen text-white">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-gold mb-2">
            ¡Hola, {user?.full_name.split(' ')[0]}!
          </h1>
          {user?.role === 'user' && <p className="text-gray-300">Plan: {userPlan.name}</p>}
        </div>

        {/* Summary Cards - Only for regular users */}
        {user?.role === 'user' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-brand-gold">Hoy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {completedHabitsCount}/{habits.length}
                </div>
                <p className="text-gray-400">Hábitos completados</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-brand-gold">Esta Semana</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{weeklyPoints}</div>
                <p className="text-gray-400">Puntos totales</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-brand-gold">Pasos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {todayHabits.steps.toLocaleString()}
                </div>
                <div className="progress-bar mt-2">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${stepProgress}%` }}
                  />
                </div>
                <p className="text-gray-400 mt-1">
                  Meta: {userPlan.step_goal.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full bg-gray-800 border border-gray-600" style={{ gridTemplateColumns: `repeat(${availableTabs.length}, minmax(0, 1fr))` }}>
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="data-[state=active]:bg-brand-gold data-[state=active]:text-black text-white"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Dashboard Tab - Only for regular users */}
          {user?.role === 'user' && (
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid gap-6">
                {/* Daily Habits Checklist */}
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-brand-gold">Hábitos Diarios</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {habits.map((habit) => (
                      <div key={habit.key} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-medium text-white">{habit.name}</h3>
                          <p className="text-sm text-gray-400">{habit.description}</p>
                        </div>
                        <button
                          className={`habit-toggle ${habit.completed ? 'completed' : ''}`}
                          onClick={() => updateHabit(habit.key, !habit.completed)}
                        >
                          {habit.completed && <Check size={16} />}
                        </button>
                      </div>
                    ))}

                    {/* Step Counter */}
                    <div className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-white">Contador de Pasos</h3>
                          <p className="text-sm text-gray-400">Ajusta manualmente tus pasos</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-center space-x-4">
                        <Button className="step-counter-btn" onClick={() => adjustSteps(-500)}>-500</Button>
                        <Button className="step-counter-btn" onClick={() => adjustSteps(-100)}>-100</Button>
                        <span className="text-xl font-bold text-brand-gold px-4">
                          {todayHabits.steps.toLocaleString()}
                        </span>
                        <Button className="step-counter-btn" onClick={() => adjustSteps(100)}>+100</Button>
                        <Button className="step-counter-btn" onClick={() => adjustSteps(500)}>+500</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Progress Bar */}
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-brand-gold">Progreso Diario</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Puntos de hoy</span>
                        <span className="text-white">{todayHabits.daily_points}/4</span>
                      </div>
                      <div className="progress-bar h-4">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${(todayHabits.daily_points / 4) * 100}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* How was your day section */}
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-brand-gold">¿Cómo fue tu día?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Comparte cómo te sientes hoy, tus logros, desafíos o cualquier reflexión..."
                      value={dailyNote}
                      onChange={(e) => setDailyNote(e.target.value)}
                      onBlur={saveNote}
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      rows={4}
                    />
                    <div className="mt-4">
                      <Button onClick={saveNote} className="bg-brand-gold text-black">
                        Guardar Nota
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Training Tab */}
          {user?.features.training && (
            <TabsContent value="training" className="space-y-6">
              {/* Workout of the Day */}
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-brand-gold">Entrenamiento del Día</CardTitle>
                </CardHeader>
                <CardContent>
                  {workoutOfDay ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">{workoutOfDay.title}</h3>
                        <p className="text-gray-300 mb-4">{workoutOfDay.description}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {JSON.parse(workoutOfDay.exercises_json || '[]').map((exercise: any, index: number) => (
                          <div key={index} className="bg-gray-800 rounded-lg p-4">
                            <h4 className="font-medium text-white mb-2">{exercise.name}</h4>
                            <p className="text-sm text-gray-400 mb-3">{exercise.description}</p>
                            {exercise.video_url && (
                              <Button 
                                size="sm" 
                                className="bg-brand-gold hover:bg-brand-gold/90 text-black"
                                onClick={() => window.open(exercise.video_url, '_blank')}
                              >
                                Ver Video
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400">No hay entrenamiento disponible para hoy.</p>
                  )}
                </CardContent>
              </Card>

              {/* Personalized Training Plan */}
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-brand-gold">Plan de Entrenamiento Personalizado</CardTitle>
                </CardHeader>
                <CardContent>
                  {userFiles.filter((file: any) => file.file_type === 'training').length > 0 ? (
                    <div className="space-y-4">
                      {userFiles.filter((file: any) => file.file_type === 'training').map((file: any) => (
                        <div key={file.id} className="bg-gray-800 rounded-lg p-4">
                          <h4 className="font-medium text-white mb-2">{file.filename}</h4>
                          <Button 
                            size="sm" 
                            className="bg-brand-gold hover:bg-brand-gold/90 text-black"
                            onClick={() => window.open(`/api/files/${file.id}`, '_blank')}
                          >
                            Ver Plan
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">No hay plan de entrenamiento personalizado disponible.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Nutrition Tab */}
          {user?.features.nutrition && (
            <TabsContent value="nutrition" className="space-y-6">
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-brand-gold">Plan de Nutrición Personalizado</CardTitle>
                </CardHeader>
                <CardContent>
                  {userFiles.filter((file: any) => file.file_type === 'nutrition').length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-gray-300 mb-4">
                        Tu plan de nutrición personalizado por la Lic. Ana Saloco
                      </p>
                      {userFiles.filter((file: any) => file.file_type === 'nutrition').map((file: any) => (
                        <div key={file.id} className="bg-gray-800 rounded-lg p-4">
                          <h4 className="font-medium text-white mb-2">{file.filename}</h4>
                          <Button 
                            size="sm" 
                            className="bg-brand-gold hover:bg-brand-gold/90 text-black"
                            onClick={() => window.open(`/api/files/${file.id}`, '_blank')}
                          >
                            Ver Plan
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">No hay plan de nutrición personalizado disponible.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Active Breaks Tab */}
          {user?.features.active_breaks && (
            <TabsContent value="active_breaks" className="space-y-6">
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-brand-gold">Pausas Activas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getContentByCategory('active_breaks').map((content: any) => (
                      <div key={content.id} className="bg-gray-800 rounded-lg p-4">
                        <h3 className="font-medium text-white mb-2">{content.title}</h3>
                        <p className="text-sm text-gray-400 mb-3">{content.description}</p>
                        {content.video_url && (
                          <Button 
                            size="sm" 
                            className="bg-brand-gold hover:bg-brand-gold/90 text-black"
                            onClick={() => window.open(content.video_url, '_blank')}
                          >
                            Ver Video
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Meditation Tab */}
          {user?.features.meditation && (
            <TabsContent value="meditation" className="space-y-6">
              <MeditationSession onComplete={handleMeditationComplete} />
            </TabsContent>
          )}

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {getPlans().map((plan, index) => (
                <Card key={plan.id} className={`bg-gray-900 border-gray-700 ${index === 1 ? 'border-brand-gold shadow-lg' : ''}`}>
                  {index === 1 && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-brand-gold text-black px-4 py-1 rounded-full text-sm">
                        Más Popular
                      </span>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-brand-gold">{plan.name}</CardTitle>
                    <p className="text-gray-300">{plan.description}</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {plan.services.map((service, serviceIndex) => (
                        <li key={serviceIndex} className="flex items-start space-x-2">
                          <Check className="h-4 w-4 text-brand-gold mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{service}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className="w-full" 
                      variant={index === 1 ? "default" : "outline"}
                    >
                      {user?.plan_type === plan.name ? 'Plan Actual' : 'Seleccionar'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DashboardPage;
