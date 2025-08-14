import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStats } from '@/hooks/api/use-user-stats';
import { Footprints, Brain, Target, TrendingUp } from 'lucide-react';

const StatsSummary: React.FC = () => {
  const { data: userStats, isLoading } = useUserStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!userStats) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No hay estadísticas disponibles</p>
      </div>
    );
  }

  const weeklyStats = userStats.weekly || {};
  const monthlyStats = userStats.monthly || {};

  const stepsGoal = 10000 * 7; // 10k steps per day for a week
  const stepsProgress = Math.min(((weeklyStats.totalSteps || 0) / stepsGoal) * 100, 100);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const summaryCards = [
    {
      title: "Pasos Semanales",
      value: formatNumber(weeklyStats.totalSteps || 0),
      description: `${stepsProgress.toFixed(0)}% del objetivo`,
      icon: Footprints,
      progress: stepsProgress,
      color: "text-blue-600"
    },
    {
      title: "Sesiones de Meditación",
      value: weeklyStats.totalMeditationSessions || 0,
      description: `${weeklyStats.totalMeditationMinutes || 0} min esta semana`,
      icon: Brain,
      color: "text-purple-600"
    },
    {
      title: "Promedio Diario",
      value: weeklyStats.averageDailyPoints || 0,
      description: "puntos por día",
      icon: Target,
      color: "text-green-600"
    },
    {
      title: "Puntos Mensuales",
      value: monthlyStats.totalPoints || 0,
      description: "últimos 30 días",
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {summaryCards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-gray-600">{card.description}</p>
            {card.progress !== undefined && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${card.progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsSummary;
