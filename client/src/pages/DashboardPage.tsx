import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, Check, Activity, Target, Apple, Brain, Coffee } from 'lucide-react';

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
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('habits');

  const today = new Date().toISOString().split('T')[0];

  // Determine available tabs based on user features
  const getAvailableTabs = () => {
    if (!user?.features) return [];

    const tabs = [];
    
    if (user.features.habits) {
      tabs.push({
        id: 'habits',
        label: 'Hábitos',
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
    
    if (user.features.active_breaks) {
      tabs.push({
        id: 'active_breaks',
        label: 'Pausas Activas',
        icon: Coffee
      });
    }
    
    if (user.features.nutrition) {
      tabs.push({
        id: 'nutrition',
        label: 'Nutrición',
        icon: Apple
      });
    }
    
    if (user.features.meditation) {
      tabs.push({
        id: 'meditation',
        label: 'Respiración',
        icon: Brain
      });
    }
    
    return tabs;
  };

  const availableTabs = getAvailableTabs();

  React.useEffect(() => {
    // Set the first available tab as active
    if (availableTabs.length > 0 && !availableTabs.find(tab => tab.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  React.useEffect(() => {
    fetchDashboardData();
    fetchDailyNote();
    fetchContentLibrary();
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

    // Always include movement/steps if habits are enabled
    if (user?.features.habits) {
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
        name: 'Respiración',
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-lg text-white">Cargando tu panel...</div>
      </div>
    );
  }

  // Check if user needs to select a plan
  if (!user?.plan_type || Object.values(user.features).every(f => !f)) {
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
          <p className="text-gray-300">Plan: {userPlan.name}</p>
        </div>

        {/* Summary Cards */}
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

          {/* Habits Tab */}
          {user?.features.habits && (
            <TabsContent value="habits" className="space-y-6">
              <div className="grid gap-6">
                {/* Daily Habits */}
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
                        <Button
                          className="step-counter-btn"
                          onClick={() => adjustSteps(-100)}
                        >
                          -100
                        </Button>
                        <Button
                          className="step-counter-btn"
                          onClick={() => adjustSteps(-500)}
                        >
                          -500
                        </Button>
                        <span className="text-xl font-bold text-brand-gold px-4">
                          {todayHabits.steps.toLocaleString()}
                        </span>
                        <Button
                          className="step-counter-btn"
                          onClick={() => adjustSteps(500)}
                        >
                          +500
                        </Button>
                        <Button
                          className="step-counter-btn"
                          onClick={() => adjustSteps(100)}
                        >
                          +100
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Calendar */}
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-brand-gold">Calendario de Progreso</CardTitle>
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        onClick={() => navigateMonth(-1)}
                        className="text-white hover:text-brand-gold"
                      >
                        <ChevronLeft />
                      </Button>
                      <h3 className="text-lg font-medium text-white">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </h3>
                      <Button
                        variant="ghost"
                        onClick={() => navigateMonth(1)}
                        className="text-white hover:text-brand-gold"
                      >
                        <ChevronRight />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                        <div key={day} className="p-2 text-sm font-medium text-gray-400">
                          {day}
                        </div>
                      ))}
                      {generateCalendarDays().map((day, index) => (
                        <div
                          key={index}
                          className={`calendar-day ${
                            !day.isCurrentMonth ? 'opacity-30' : ''
                          } ${
                            day.isToday ? 'today' : ''
                          } ${
                            day.points === 4 ? 'completed-full' :
                            day.points > 0 ? 'completed-partial' : ''
                          }`}
                        >
                          {day.date.getDate()}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Notes */}
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-brand-gold">Notas Diarias</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="¿Cómo te sientes hoy? Escribe tus pensamientos..."
                      value={dailyNote}
                      onChange={(e) => setDailyNote(e.target.value)}
                      onBlur={saveNote}
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      rows={4}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Training Tab */}
          {user?.features.training && (
            <TabsContent value="training" className="space-y-6">
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-brand-gold">Entrenamientos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getContentByCategory('exercise').map((content: any) => (
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

          {/* Nutrition Tab */}
          {user?.features.nutrition && (
            <TabsContent value="nutrition" className="space-y-6">
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-brand-gold">Plan de Nutrición</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    Tu plan de nutrición personalizado por la Lic. Ana Saloco
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getContentByCategory('nutrition').map((content: any) => (
                      <div key={content.id} className="bg-gray-800 rounded-lg p-4">
                        <h3 className="font-medium text-white mb-2">{content.title}</h3>
                        <p className="text-sm text-gray-400 mb-3">{content.description}</p>
                        {content.video_url && (
                          <Button 
                            size="sm" 
                            className="bg-brand-gold hover:bg-brand-gold/90 text-black"
                            onClick={() => window.open(content.video_url, '_blank')}
                          >
                            Ver Contenido
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
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-brand-gold">Ejercicios de Respiración</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getContentByCategory('meditation').map((content: any) => (
                      <div key={content.id} className="bg-gray-800 rounded-lg p-4">
                        <h3 className="font-medium text-white mb-2">{content.title}</h3>
                        <p className="text-sm text-gray-400 mb-3">{content.description}</p>
                        {content.video_url && (
                          <Button 
                            size="sm" 
                            className="bg-brand-gold hover:bg-brand-gold/90 text-black"
                            onClick={() => window.open(content.video_url, '_blank')}
                          >
                            Comenzar
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default DashboardPage;
