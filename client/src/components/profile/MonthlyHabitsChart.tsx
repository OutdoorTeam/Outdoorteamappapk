import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MonthlyHabitsChartProps {
  data: Array<{
    name: string;
    completed: number;
    total: number;
    percentage: number;
  }>;
}

const MonthlyHabitsChart: React.FC<MonthlyHabitsChartProps> = ({ data }) => {
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

  const dataWithColors = data.map(item => ({
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
          {data.map((item, index) => (
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
      </CardContent>
    </Card>
  );
};

export default MonthlyHabitsChart;
