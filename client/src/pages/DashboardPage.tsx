import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  useTodayHabits, 
  useWeeklyPoints, 
  useCalendarData, 
  useUpdateHabit 
} from "@/hooks/api/use-daily-habits";
import { useTodayNote, useSaveNote } from "@/hooks/api/use-daily-notes";
import { useSaveMeditationSession } from "@/hooks/api/use-meditation";
import { useMyGoals } from "@/hooks/api/use-user-goals";

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dailyNote, setDailyNote] = React.useState("");
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  // React Query hooks with better error handling
  const { data: todayHabits, isLoading: habitsLoading, refetch: refetchHabits } = useTodayHabits();
  const { data: weeklyPointsData, isLoading: weeklyLoading } = useWeeklyPoints();
  const { data: calendarData, isLoading: calendarLoading } = useCalendarData();
  const { data: todayNoteData, isLoading: noteLoading } = useTodayNote();
  const { data: userGoals, isLoading: goalsLoading } = useMyGoals();
  
  // Mutations
  const updateHabitMutation = useUpdateHabit();
  const saveNoteMutation = useSaveNote();
  const saveMeditationMutation = useSaveMeditationSession();

  // Use user goals or defaults
  const stepGoal = userGoals?.daily_steps_goal || 8000;
  const weeklyGoal = userGoals?.weekly_points_goal || 28;

  // Initialize note from query data
  React.useEffect(() => {
    if (todayNoteData && typeof todayNoteData.content === 'string') {
      setDailyNote(todayNoteData.content);
    }
  }, [todayNoteData]);

  const handleUpdateHabit = async (habitType: string, completed: boolean) => {
    setIsUpdating(habitType);
    
    try {
      await updateHabitMutation.mutateAsync({
        date: today,
        [habitType]: completed,
      });
      
      // Refetch habits to ensure UI is updated
      await refetchHabits();
      
      toast({
        title: completed ? "¡Hábito completado!" : "Hábito desmarcado",
        description: completed ? "¡Excelente trabajo!" : "Hábito desmarcado correctamente",
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating habit:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el hábito. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleAdjustSteps = async (adjustment: number) => {
    const currentSteps = todayHabits?.steps || 0;
    const newSteps = Math.max(0, currentSteps + adjustment);

    try {
      await updateHabitMutation.mutateAsync({
        date: today,
        steps: newSteps,
        movement_completed: newSteps >= stepGoal,
      });
    } catch (error) {
      console.error("Error updating steps:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el contador de pasos",
        variant: "destructive",
      });
    }
  };

  const handleSaveNote = async () => {
    if (!dailyNote.trim()) return;
    
    try {
      await saveNoteMutation.mutateAsync({
        content: dailyNote,
        date: today,
      });
      
      toast({
        title: "Nota guardada",
        description: "Tu nota del día ha sido guardada exitosamente",
        variant: "default",
      });
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la nota",
        variant: "destructive",
      });
    }
  };

  const handleMeditationComplete = async (
    duration: number,
    type: string,
    comment: string,
  ) => {
    try {
      await saveMeditationMutation.mutateAsync({
        duration_minutes: duration,
        meditation_type: type,
        comment: comment,
      });

      // Update meditation habit
      await handleUpdateHabit("meditation_completed", true);

      toast({
        title: "¡Meditación completada!",
        description: "Se agregó 1 punto a tu progreso diario",
        variant: "default",
      });
    } catch (error) {
      console.error("Error completing meditation:", error);
      toast({
        title: "Error",
        description: "No se pudo completar la meditación",
        variant: "destructive",
      });
    }
  };

  const getAllHabits = () => {
    const habits = [];

    // Always show Exercise if user has training feature or is admin
    if (user?.features.training || user?.role === "admin") {
      habits.push({
        key: "training_completed" as const,
        name: "Ejercicio",
        description: "Realizar la rutina de ejercicios del día",
        completed: Boolean(todayHabits?.training_completed),
        icon: "💪",
      });
    }

    // Always show Nutrition if user has nutrition feature or is admin
    if (user?.features.nutrition || user?.role === "admin") {
      habits.push({
        key: "nutrition_completed" as const,
        name: "Alimentación",
        description: "Seguir el plan nutricional del día",
        completed: Boolean(todayHabits?.nutrition_completed),
        icon: "🥗",
      });
    }

    // Always show Steps - this is available to all users
    habits.push({
      key: "movement_completed" as const,
      name: "Pasos diarios",
      description: `Completar ${stepGoal.toLocaleString()} pasos`,
      completed: Boolean(todayHabits?.movement_completed),
      icon: "👟",
    });

    // Always show Meditation if user has meditation feature or is admin
    if (user?.features.meditation || user?.role === "admin") {
      habits.push({
        key: "meditation_completed" as const,
        name: "Respiración",
        description: "Practicar ejercicios de respiración y relajación",
        completed: Boolean(todayHabits?.meditation_completed),
        icon: "🧘",
      });
    }

    return habits;
  };

  // Calendar helpers
  const generateCalendarDays = () => {
    const firstDay = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const points = calendarData?.find((day: any) => day.date === dateStr)?.daily_points || 0;
      const isCurrentMonth = currentDate.getMonth() === currentMonth.getMonth();
      const isToday = dateStr === today;

      days.push({
        date: new Date(currentDate),
        dateStr,
        points,
        isCurrentMonth,
        isToday,
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
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];

  const habits = getAllHabits();
  const completedHabitsCount = habits.filter((h) => h.completed).length;
  const currentSteps = todayHabits?.steps || 0;
  const stepsProgress = Math.min((currentSteps / stepGoal) * 100, 100);
  const weeklyPoints = weeklyPointsData?.total_points || 0;
  const weeklyProgress = Math.min((weeklyPoints / weeklyGoal) * 100, 100);

  const isLoading = habitsLoading || weeklyLoading || calendarLoading || noteLoading || goalsLoading;

  // Show loading screen only on initial load
  if (isLoading && user?.role === "user" && !todayHabits) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-lg text-white">Cargando tu panel...</div>
      </div>
    );
  }

  // Check if user needs to select a plan
  if (
    user?.role === "user" &&
    (!user?.plan_type || Object.values(user.features).every((f) => !f))
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center text-white p-8">
          <h1 className="text-2xl font-bold mb-4">¡Bienvenido!</h1>
          <p className="mb-4">Necesitas seleccionar un plan para continuar.</p>
          <Button onClick={() => (window.location.href = "/plan-selection")}>
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
          <h1 className="text-3xl font-bold text-[#D3B869] mb-2">
            Academia de Hábitos Saludables
          </h1>
        </div>

        {/* Top Section - Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Puntos Hoy */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Puntos Hoy</div>
                  <div className="text-2xl font-bold text-[#D3B869]">
                    {todayHabits?.daily_points || 0}
                  </div>
                </div>
                <div className="text-3xl">🏆</div>
              </div>
            </CardContent>
          </Card>

          {/* Hábitos Completados */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400 mb-1">
                    Hábitos Completados
                  </div>
                  <div className="text-2xl font-bold text-[#D3B869]">
                    {completedHabitsCount}/{habits.length}
                  </div>
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
                  <div className="text-sm text-gray-400 mb-1">
                    Esta Semana
                    <span className="text-xs ml-2">Meta: {weeklyGoal}</span>
                  </div>
                  <div className="text-2xl font-bold text-[#D3B869]">
                    {weeklyPoints}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {weeklyProgress.toFixed(1)}% de la meta
                  </div>
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
                  <span className="text-sm text-gray-400">
                    Meta diaria: {stepGoal.toLocaleString()} pasos
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-5xl font-bold text-white mb-2">
                    {currentSteps.toLocaleString()}
                  </div>
                  <div className="text-gray-400 text-sm mb-4">
                    {stepsProgress.toFixed(1)}% de la meta
                  </div>

                  {/* Progress bar */}
                  <div className="progress-bar mb-6 max-w-md mx-auto">
                    <div
                      className="progress-fill"
                      style={{ width: `${stepsProgress}%` }}
                    ></div>
                  </div>

                  {/* Step adjustment buttons */}
                  <div className="flex justify-center items-center gap-4 mb-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAdjustSteps(-1000)}
                      disabled={updateHabitMutation.isPending}
                      className="bg-gray-700 border-[#D3B869] text-[#D3B869] hover:bg-[#D3B869] hover:text-black"
                    >
                      -1000
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAdjustSteps(-100)}
                      disabled={updateHabitMutation.isPending}
                      className="bg-gray-700 border-[#D3B869] text-[#D3B869] hover:bg-[#D3B869] hover:text-black"
                    >
                      -100
                    </Button>
                    <div className="text-lg font-bold text-[#D3B869] px-4 min-w-[80px] text-center">
                      {currentSteps}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAdjustSteps(100)}
                      disabled={updateHabitMutation.isPending}
                      className="bg-gray-700 border-[#D3B869] text-[#D3B869] hover:bg-[#D3B869] hover:text-black"
                    >
                      +100
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAdjustSteps(1000)}
                      disabled={updateHabitMutation.isPending}
                      className="bg-gray-700 border-[#D3B869] text-[#D3B869] hover:bg-[#D3B869] hover:text-black"
                    >
                      +1000
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ¿Cómo te fue hoy? - All 4 habits */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-[#D3B869]">
                  ¿Cómo te fue hoy?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {habits.map((habit) => (
                    <div
                      key={habit.key}
                      className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{habit.icon}</div>
                        <div>
                          <div className="font-medium text-white">
                            {habit.name}
                          </div>
                          <div className="text-sm text-gray-400">
                            {habit.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#D3B869] font-bold">+1</span>
                        <button
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                            habit.completed
                              ? "bg-[#D3B869] border-[#D3B869] text-black"
                              : "border-[#D3B869] text-[#D3B869] hover:bg-[#D3B869]/20"
                          } ${
                            isUpdating === habit.key || updateHabitMutation.isPending 
                              ? 'opacity-50 cursor-not-allowed' 
                              : ''
                          }`}
                          onClick={() => handleUpdateHabit(habit.key, !habit.completed)}
                          disabled={isUpdating === habit.key || updateHabitMutation.isPending}
                        >
                          {(isUpdating === habit.key) ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : habit.completed ? (
                            <Check size={18} />
                          ) : null}
                        </button>
                      </div>
                    </div>
                  ))}
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
                  placeholder="Escribe tus reflexiones del día, logros, retos, etc..."
                  value={dailyNote}
                  onChange={(e) => setDailyNote(e.target.value)}
                  onBlur={handleSaveNote}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 min-h-[100px]"
                  disabled={saveNoteMutation.isPending}
                />
                <Button
                  onClick={handleSaveNote}
                  disabled={saveNoteMutation.isPending || !dailyNote.trim()}
                  className="bg-[#D3B869] text-black hover:bg-[#D3B869]/90 mt-4"
                >
                  {saveNoteMutation.isPending ? 'Guardando...' : 'Guardar Nota'}
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
                      {monthNames[currentMonth.getMonth()]}{" "}
                      {currentMonth.getFullYear()}
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
                  {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
                    <div
                      key={day}
                      className="text-center text-gray-400 text-sm p-2 font-medium"
                    >
                      {day}
                    </div>
                  ))}
                  {generateCalendarDays().map((day, index) => (
                    <div
                      key={index}
                      className={`
                        text-center p-2 text-sm rounded cursor-pointer transition-colors
                        ${day.isCurrentMonth ? "text-white" : "text-gray-600"}
                        ${day.isToday ? "bg-[#D3B869] text-black font-bold" : ""}
                        ${
                          day.points === 4
                            ? "bg-green-600"
                            : day.points >= 2
                              ? "bg-orange-500"
                              : day.points > 0
                                ? "bg-yellow-600"
                                : ""
                        }
                        ${!day.isToday && day.points === 0 ? "hover:bg-gray-700" : ""}
                      `}
                      title={`${day.points} puntos`}
                    >
                      {day.date.getDate()}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-4 text-xs text-gray-400">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-600 rounded"></div>
                      <span>4 puntos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span>2-3 puntos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-600 rounded"></div>
                      <span>1 punto</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border border-gray-600 rounded"></div>
                      <span>0 puntos</span>
                    </div>
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
