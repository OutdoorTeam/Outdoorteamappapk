import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, Check, Plus, Minus } from 'lucide-react';
import MeditationSession from '@/components/MeditationSession';

interface DailyHabit {
  training_completed: boolean;
  nutrition_completed: boolean;
  movement_completed: boolean;
  meditation_completed: boolean;
  steps: number;
  daily_points: number;
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
  const [weeklyPoints, setWeeklyPoints] = React.useState(1);
  const [dailyNote, setDailyNote] = React.useState('');
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [calendarData, setCalendarData] = React.useState<{[key: string]: number}>({});
  const [isLoading, setIsLoading] = React.useState(true);

  const today = new Date().toISOString().split('T')[0];
  const stepGoal = 8000;

  React.useEffect(() => {
    if (user?.role === 'user') {
      fetchDashboardData();
      fetchDailyNote();
    }
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
          movement_completed: newSteps >= stepGoal
        })
      });

      if (response.ok) {
        const updatedData = await response.json();
        setTodayHabits(prev => ({
          ...prev,
          steps: newSteps,
          movement_completed: newSteps >= stepGoal,
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
        description: 'Realizar la rutina de ejercicios del día',
        completed: todayHabits.training_completed
      });
    }

    if (user?.features.nutrition) {
      habits.push({
        key: 'nutrition_completed' as const,
        name: 'Alimentación',
        description: 'Seguir el plan nutricional del día',
        completed: todayHabits.nutrition_completed
      });
    }

    if (user?.features.meditation) {
      habits.push({
        key: 'meditation_completed' as const,
        name: 'Respiración',
        description: 'Practicar ejercicios de respiración y relajación',
        completed: todayHabits.meditation_completed
      });
    }

    return habits;
  };

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
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const habits = getHabitsForUser();
  const completedHabitsCount = habits.filter(h => h.completed).length;
  const stepsProgress = Math.min((todayHabits.steps / stepGoal) * 100, 100);

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
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#D3B869] mb-2">Programa Totum</h1>
        </div>

        {/* Top Section - Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Puntos Hoy */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Puntos Hoy</div>
                  <div className="text-2xl font-bold text-[#D3B869]">{weeklyPoints}</div>
                </div>
                <div className="text-3xl">🏆</div>
              </div>
            </CardContent>
          </Card>

          {/* Hábitos */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Hábitos</div>
                  <div className="text-2xl font-bold text-[#D3B869]">{completedHabitsCount}</div>
                </div>
                <div className="text-3xl">⭐</div>
              </div>
            </CardContent>
          </Card>

          {/* Esta Semana */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Esta Semana</div>
                  <div className="text-2xl font-bold text-[#D3B869]">{weeklyPoints}</div>
                </div>
                <div className="text-3xl">🎯</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step Counter */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-[#D3B869] flex items-center gap-2">
                  👟 Contador de Pasos
                  <span className="text-sm text-gray-400">Mantén un registro de tu actividad diaria</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-5xl font-bold text-white mb-2">
                    {todayHabits.steps.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-sm mb-4">0.0%</div>
                  <div className="text-gray-400 text-sm mb-6">{stepGoal.toLocaleString()} pasos</div>
                  
                  {/* Step adjustment buttons */}
                  <div className="flex justify-center items-center gap-4 mb-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adjustSteps(-100)}
                      className="bg-gray-700 border-[#D3B869] text-[#D3B869] hover:bg-[#D3B869] hover:text-black"
                    >
                      -100
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adjustSteps(-100)}
                      className="bg-gray-700 border-[#D3B869] text-[#D3B869] hover:bg-[#D3B869] hover:text-black"
                    >
                      -10
                    </Button>
                    <div className="text-2xl font-bold text-[#D3B869] px-4">0</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adjustSteps(100)}
                      className="bg-gray-700 border-[#D3B869] text-[#D3B869] hover:bg-[#D3B869] hover:text-black"
                    >
                      +10
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adjustSteps(100)}
                      className="bg-gray-700 border-[#D3B869] text-[#D3B869] hover:bg-[#D3B869] hover:text-black"
                    >
                      +100
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ¿Cómo te fue hoy? */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-[#D3B869]">¿Cómo te fue hoy?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {habits.map((habit) => (
                    <div key={habit.key} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium text-white">{habit.name}</div>
                          <div className="text-sm text-gray-400">{habit.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#D3B869] font-bold">+1</span>
                        <button
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            habit.completed 
                              ? 'bg-[#D3B869] border-[#D3B869] text-black' 
                              : 'border-[#D3B869] text-[#D3B869]'
                          }`}
                          onClick={() => updateHabit(habit.key, !habit.completed)}
                        >
                          {habit.completed && <Check size={16} />}
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Steps habit */}
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium text-white">Pasos diarios</div>
                        <div className="text-sm text-gray-400">Completar la meta establecida</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#D3B869] font-bold">+1</span>
                      <button
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          todayHabits.movement_completed 
                            ? 'bg-[#D3B869] border-[#D3B869] text-black' 
                            : 'border-[#D3B869] text-[#D3B869]'
                        }`}
                        onClick={() => updateHabit('movement_completed', !todayHabits.movement_completed)}
                      >
                        {todayHabits.movement_completed && <Check size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notas del Día */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-[#D3B869]">Notas del Día</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Escriba tus reflexiones del día, logros, retos, etc..."
                  value={dailyNote}
                  onChange={(e) => setDailyNote(e.target.value)}
                  onBlur={saveNote}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 min-h-[100px]"
                />
                <Button 
                  onClick={saveNote} 
                  className="bg-[#D3B869] text-black hover:bg-[#D3B869]/90 mt-4"
                >
                  Guardar Nota
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Calendar */}
          <div className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#D3B869] flex items-center gap-2">
                    📅 Calendario de Hábitos
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigateMonth(-1)}
                      className="text-[#D3B869] hover:text-white"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="text-white font-medium min-w-[120px] text-center">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </span>
                    <button 
                      onClick={() => navigateMonth(1)}
                      className="text-[#D3B869] hover:text-white"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                    <div key={day} className="text-center text-gray-400 text-sm p-2 font-medium">
                      {day}
                    </div>
                  ))}
                  {generateCalendarDays().map((day, index) => (
                    <div
                      key={index}
                      className={`
                        text-center p-2 text-sm rounded cursor-pointer transition-colors
                        ${day.isCurrentMonth ? 'text-white' : 'text-gray-600'}
                        ${day.isToday ? 'bg-[#D3B869] text-black font-bold' : ''}
                        ${day.points === 4 ? 'bg-green-600' : 
                          day.points >= 2 ? 'bg-orange-500' : 
                          day.points > 0 ? 'bg-yellow-600' : ''}
                        ${!day.isToday && day.points === 0 ? 'hover:bg-gray-700' : ''}
                      `}
                    >
                      {day.date.getDate()}
                    </div>
                  ))}
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