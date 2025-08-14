import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStats } from '@/hooks/api/use-user-stats';

const MonthlyHabitsChart: React.FC = () => {
  const { data: userStats, isLoading } = useUserStats();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-blue-600">
            Completado: {data.completed}/{data.total} días ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const getBarColor = (percentage: number) => {
    if (percentage >= 80) return '#16a34a'; // Green
    if (percentage >= 60) return '#ca8a04'; // Yellow
    if (percentage >= 40) return '#ea580c'; // Orange
    return '#dc2626'; // Red
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Completitud de Hábitos - Últimos 30 Días</CardTitle>
          <CardDescription>Días completados por cada hábito</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Cargando datos...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = userStats?.monthly?.habitCompletionData || [];
  const dataWithColors = data.map((item: any) => ({
    ...item,
    fill: getBarColor(item.percentage)
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Completitud de Hábitos - Últimos 30 Días</CardTitle>
        <CardDescription>Días completados por cada hábito</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">No hay datos disponibles</p>
              <p className="text-sm text-muted-foreground mt-1">Completa hábitos para ver tu progreso</p>
            </div>
          </div>
        ) : (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataWithColors} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={12}
                    stroke="#666"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    fontSize={12}
                    stroke="#666"
                    domain={[0, 30]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="completed" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {data.map((item: any, index: number) => (
                <div key={index} className="text-center">
                  <div className={`text-lg font-bold ${
                    item.percentage >= 80 ? 'text-green-600' :
                    item.percentage >= 60 ? 'text-yellow-600' :
                    item.percentage >= 40 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {item.percentage}%
                  </div>
                  <div className="text-gray-600">{item.name}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyHabitsChart;
