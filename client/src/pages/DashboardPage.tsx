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