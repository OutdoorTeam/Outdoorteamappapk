import * as React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStats } from '@/hooks/api/use-user-stats';

const HabitCompletionDonut: React.FC = () => {
  const { data: userStats, isLoading } = useUserStats();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-2 shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">{data.value}% completado</p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (value < 10) return null; // Don't show label for very small slices

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${value}%`}
      </text>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tasa de Completitud Mensual</CardTitle>
          <CardDescription>Porcentaje de días completados por hábito</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Cargando datos...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const habitRates = userStats?.monthly?.habitCompletionRates || {
    training: 0,
    nutrition: 0,
    movement: 0,
    meditation: 0
  };

  const chartData = [
    { name: 'Entrenamiento', value: habitRates.training, color: '#2563eb' },
    { name: 'Nutrición', value: habitRates.nutrition, color: '#16a34a' },
    { name: 'Movimiento', value: habitRates.movement, color: '#ca8a04' },
    { name: 'Meditación', value: habitRates.meditation, color: '#9333ea' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasa de Completitud Mensual</CardTitle>
        <CardDescription>Porcentaje de días completados por hábito</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.every(item => item.value === 0) ? (
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
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={CustomLabel}
                    outerRadius={80}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-gray-600">{item.name}</span>
                  <span className="font-medium ml-auto">{item.value}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default HabitCompletionDonut;
