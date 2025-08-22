import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserTrainingSchedule } from "@/hooks/api/use-training-schedule";
import { useContentLibrary } from "@/hooks/api/use-content-library";
import { Play, Clock, RotateCcw, BookOpen, Calendar } from "lucide-react";

const TrainingPage: React.FC = () => {
  const { user } = useAuth();
  const { data: scheduleData, isLoading: scheduleLoading } = useUserTrainingSchedule(user?.id || 0);
  const { data: contentLibrary, isLoading: contentLoading } = useContentLibrary('exercise');

  // Get video thumbnail from YouTube URL
  const getYouTubeThumbnail = (url: string | null) => {
    if (!url) return null;
    
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    
    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
    
    return null;
  };

  // Helper to get video URL for exercise
  const getVideoUrl = (exercise: any) => {
    if (exercise.video_url) {
      return exercise.video_url;
    }
    
    // Find in content library if linked
    if (exercise.content_library_id && contentLibrary) {
      const content = contentLibrary.find((c: any) => c.id === exercise.content_library_id);
      return content?.video_url || null;
    }
    
    return null;
  };

  const openVideoInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Define days of the week in Spanish
  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  if (scheduleLoading || contentLoading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-lg text-white">Cargando plan de entrenamiento...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!scheduleData?.schedule) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#D3B869] mb-4">Plan de Entrenamiento</h1>
          </div>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-12">
              <div className="text-center">
                <Calendar className="w-16 h-16 mx-auto mb-6 text-gray-400" />
                <h2 className="text-xl font-semibold text-white mb-4">
                  No tienes un plan de entrenamiento asignado
                </h2>
                <p className="text-gray-400 mb-6">
                  Tu administrador aún no ha creado un plan personalizado para ti.
                </p>
                <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    💡 Tu plan de entrenamiento será creado por el equipo de profesionales
                    basándose en tus objetivos y nivel de condición física.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#D3B869] mb-2">
            Plan de Entrenamiento
          </h1>
          {scheduleData.schedule && (
            <div className="flex items-center gap-4 text-gray-300">
              <span className="font-medium">{scheduleData.schedule.plan_title}</span>
              <span className="text-sm bg-gray-700 px-2 py-1 rounded">
                Semana {scheduleData.schedule.week_number}
              </span>
            </div>
          )}
        </div>

        {/* Weekly Schedule */}
        <div className="grid grid-cols-1 gap-6">
          {daysOfWeek.map((dayName) => {
            const dayExercises = scheduleData.exercises[dayName] || [];
            
            return (
              <Card key={dayName} className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-[#D3B869] text-xl">
                    {dayName}
                    {dayExercises.length > 0 && (
                      <span className="text-sm text-gray-400 ml-2 font-normal">
                        ({dayExercises.length} ejercicio{dayExercises.length !== 1 ? 's' : ''})
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dayExercises.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Día de descanso</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-white">
                        <thead>
                          <tr className="border-b border-gray-600">
                            <th className="text-left py-3 px-2 text-[