import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

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
  const [isLoading, setIsLoading] = React.useState(true);

  const today = new Date().toISOString().split('T')[0];

  React.useEffect(() => {
    fetchDashboardData();
    fetchDailyNote();
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

  const habits = [
    {
      key: 'training_completed' as const,
      name: 'Ejercicio',
      description: 'Completaste tu rutina de entrenamiento',
      completed: todayHabits.training_completed
    },
    {
      key: 'movement_completed' as const,
      name: 'Pasos diarios',
      description: `Alcanzaste tu meta de ${userPlan.step_goal.toLocaleString()} pasos`,
      completed: todayHabits.movement_completed
    },
    {
      key: 'nutrition_completed' as const,
      name: 'Alimentación',
      description: 'Seguiste tu plan nutricional',
      completed: todayHabits.nutrition_completed
    },
    {
      key: 'meditation_completed' as const,
      name: 'Respiración',
      description: 'Realizaste ejercicios de respiración o meditación',
      completed: todayHabits.meditation_completed
    }
  ];

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-lg text-white">Cargando tu panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-gold mb-2">{userPlan.name}</h1>
          <p className="text-gray-300">¡Bienvenido, {user?.full_name.split(' ')[0]}!</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Step Counter */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-brand-gold text-xl">Contador de Pasos</CardTitle>
                <p className="text-gray-400 text-sm">Registra tu actividad física diaria</p>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold text-white mb-2">
                    {todayHabits.steps.toLocaleString()}
                  </div>
                  <div className="text-brand-gold">
                    Meta diaria: {userPlan.step_goal.toLocaleString()}
                  </div>
                  <div className="progress-bar mt-4">
                    <div className="progress-fill" style={{ width: `${stepProgress}%` }}></div>
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    {Math.round(stepProgress)}% completado
                  </div>
                </div>
                
                <div className="flex justify-center gap-2">
                  <button 
                    className="step-counter-btn" 
                    onClick={() => adjustSteps(-500)}
                  >
                    -500
                  </button>
                  <button 
                    className="step-counter-btn" 
                    onClick={() => adjustSteps(-100)}
                  >
                    -100
                  </button>
                  <button 
                    className="step-counter-btn" 
                    onClick={() => adjustSteps(-todayHabits.steps)}
                  >
                    0
                  </button>
                  <button 
                    className="step-counter-btn" 
                    onClick={() => adjustSteps(100)}
                  >
                    +100
                  </button>
                  <button 
                    className="step-counter-btn" 
                    onClick={() => adjustSteps(500)}
                  >
                    +500
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Habits */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-brand-gold text-xl">¿Cómo te fue hoy?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {habits.map((habit) => (
                    <div key={habit.key} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-white">{habit.name}</h3>
                        <p className="text-sm text-gray-400">{habit.description}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-brand-gold font-bold">+1</span>
                        <div
                          className={`habit-toggle ${habit.completed ? 'completed' : ''}`}
                          onClick={() => updateHabit(habit.key, !habit.completed)}
                        >
                          {habit.completed && <Check size={14} />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Notes */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-brand-gold text-xl">Notas del Día</CardTitle>
                <p className="text-gray-400 text-sm">Reflexiona sobre tu día, logros y desafíos</p>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="¿Cómo te sentiste hoy? ¿Qué lograste? ¿Qué desafíos enfrentaste?"
                  value={dailyNote}
                  onChange={(e) => setDailyNote(e.target.value)}
                  className="mb-4 bg-gray-800 border-gray-600 text-white min-h-[120px]"
                />
                <Button 
                  onClick={saveNote}
                  className="bg-brand-gold text-black hover:bg-yellow-500"
                >
                  Guardar Nota
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Stats Box */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-brand-gold text-lg">Resumen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold text-white">{todayHabits.daily_points}</div>
                    <div className="text-gray-400 text-sm">Puntos Hoy</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{completedHabitsCount}/4</div>
                    <div className="text-gray-400 text-sm">Hábitos</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{weeklyPoints}</div>
                    <div className="text-gray-400 text-sm">Esta Semana</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calendar */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-brand-gold text-lg">Calendario de Hábitos</CardTitle>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigateMonth(-1)}
                      className="p-1 hover:bg-gray-700 rounded"
                    >
                      <ChevronLeft className="text-brand-gold" size={20} />
                    </button>
                    <button
                      onClick={() => navigateMonth(1)}
                      className="p-1 hover:bg-gray-700 rounded"
                    >
                      <ChevronRight className="text-brand-gold" size={20} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-400">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                    <div key={day} className="text-xs text-gray-400 text-center p-1">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarDays().map((day, index) => (
                    <div
                      key={index}
                      className={`
                        calendar-day text-xs
                        ${!day.isCurrentMonth ? 'opacity-30' : ''}
                        ${day.isToday ? 'today' : ''}
                        ${day.points >= 2 ? 'completed-full' : ''}
                        ${day.points === 1 ? 'completed-partial' : ''}
                      `}
                    >
                      {day.date.getDate()}
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-gray-400">2+ hábitos completados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <span className="text-gray-400">1 hábito completado</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
