import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface WeeklyPointsChartProps {
  data: Array<{
    date: string;
    points: number;
    steps: number;
    meditationSessions: number;
    meditationMinutes: number;
  }>;
}

const WeeklyPointsChart: React.FC<WeeklyPointsChartProps> = ({ data }) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Puntos Diarios - Última Semana</CardTitle>
        <CardDescription>Progreso de hábitos completados por día</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
      </CardContent>
    </Card>
  );
};

export default WeeklyPointsChart;
