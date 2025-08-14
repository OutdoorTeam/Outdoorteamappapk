import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStats } from '@/hooks/api/use-user-stats';

const WeeklyPointsChart: React.FC = () => {
  const { data: userStats, isLoading } = useUserStats();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return 'Hoy';
    if (daysDiff === 1) return 'Ayer';
    
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-gray-900">{formatDate(label)}</p>
          <p className="text-blue-600">
            <span className="inline-block w-3 h-3 bg-blue-600 rounded mr-2"></span>
            Puntos: {data.points}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Pasos: {data.steps.toLocaleString()}
          </p>
          {data.meditationSessions > 0 && (
            <p className="text-sm text-gray-600">
              Meditación: {data.meditationSessions} sesión{data.meditationSessions !== 1 ? 'es' : ''} 
              ({data.meditationMinutes} min)
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Puntos Diarios - Última Semana</CardTitle>
          <CardDescription>Progreso de hábitos completados por día</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Cargando datos...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const weeklyData = userStats?.weekly?.dailyData || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Puntos Diarios - Última Semana</CardTitle>
        <CardDescription>Progreso de hábitos completados por día</CardDescription>
      </CardHeader>
      <CardContent>
        {weeklyData.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">No hay datos disponibles</p>
              <p className="text-sm text-muted-foreground mt-1">Completa hábitos para ver tu progreso</p>
            </div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  fontSize={12}
                  stroke="#666"
                />
                <YAxis fontSize={12} stroke="#666" />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="points" 
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyPointsChart;
