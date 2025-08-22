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

  const formatRestTime = (seconds: number | null) => {
    if (!seconds) return '-';
    
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (remainingSeconds === 0) {
        return `${minutes} min`;
      }
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    return `${seconds}s`;
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
                            <th className="text-left py-3 px-2 text-[#D3B869] font-medium">Exercise</th>
                            <th className="text-center py-3 px-2 text-[#D3B869] font-medium w-16">Sets</th>
                            <th className="text-center py-3 px-2 text-[#D3B869] font-medium w-16">Reps</th>
                            <th className="text-center py-3 px-2 text-[#D3B869] font-medium w-20">Rest</th>
                            <th className="text-center py-3 px-2 text-[#D3B869] font-medium w-20">Intensity</th>
                            <th className="text-center py-3 px-2 text-[#D3B869] font-medium w-16">Video</th>
                            <th className="text-left py-3 px-2 text-[#D3B869] font-medium">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayExercises.map((exercise, index) => {
                            const videoUrl = getVideoUrl(exercise);
                            const thumbnail = getYouTubeThumbnail(videoUrl);
                            
                            return (
                              <tr key={exercise.id || index} className="border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="py-4 px-2">
                                  <div className="font-medium text-white">
                                    {exercise.exercise_name}
                                  </div>
                                  {exercise.library_title && (
                                    <div className="text-sm text-gray-400 mt-1">
                                      {exercise.library_title}
                                    </div>
                                  )}
                                </td>
                                <td className="text-center py-4 px-2">
                                  <span className="text-sm font-medium">
                                    {exercise.sets || '-'}
                                  </span>
                                </td>
                                <td className="text-center py-4 px-2">
                                  <span className="text-sm font-medium">
                                    {exercise.reps || '-'}
                                  </span>
                                </td>
                                <td className="text-center py-4 px-2">
                                  <span className="text-sm">
                                    {formatRestTime(exercise.rest_seconds)}
                                  </span>
                                </td>
                                <td className="text-center py-4 px-2">
                                  {exercise.intensity && (
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      exercise.intensity === 'Alta' || exercise.intensity?.startsWith('RPE9') || exercise.intensity?.startsWith('RPE10')
                                        ? 'bg-red-900 text-red-300'
                                        : exercise.intensity === 'Media' || exercise.intensity?.startsWith('RPE6') || exercise.intensity?.startsWith('RPE7') || exercise.intensity?.startsWith('RPE8')
                                          ? 'bg-orange-900 text-orange-300'
                                          : 'bg-green-900 text-green-300'
                                    }`}>
                                      {exercise.intensity}
                                    </span>
                                  )}
                                </td>
                                <td className="text-center py-4 px-2">
                                  {videoUrl ? (
                                    <div className="flex justify-center">
                                      {thumbnail ? (
                                        <button
                                          onClick={() => openVideoInNewTab(videoUrl)}
                                          className="relative group"
                                        >
                                          <img
                                            src={thumbnail}
                                            alt="Video thumbnail"
                                            className="w-12 h-8 object-cover rounded border border-gray-600 group-hover:border-[#D3B869] transition-colors"
                                          />
                                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Play className="w-4 h-4 text-white" />
                                          </div>
                                        </button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => openVideoInNewTab(videoUrl)}
                                          className="h-8 w-12 p-0 text-[#D3B869] hover:text-white hover:bg-[#D3B869]/20"
                                        >
                                          <Play className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-500 text-xs">-</span>
                                  )}
                                </td>
                                <td className="py-4 px-2">
                                  {exercise.notes ? (
                                    <div className="text-sm text-gray-300 max-w-xs">
                                      {exercise.notes}
                                    </div>
                                  ) : (
                                    <span className="text-gray-500 text-xs">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/exercises'}
            className="bg-gray-700 border-[#D3B869] text-[#D3B869] hover:bg-[#D3B869] hover:text-black"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Ver Biblioteca de Ejercicios
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TrainingPage;
