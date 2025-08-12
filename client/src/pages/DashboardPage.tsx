import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [steps, setSteps] = React.useState('');
  const [todayNote, setTodayNote] = React.useState('');
  const [habits, setHabits] = React.useState([
    { id: 1, name: 'Beber 8 vasos de agua', completed: false },
    { id: 2, name: 'Ejercitarse por 30 minutos', completed: true },
    { id: 3, name: 'Comer 5 porciones de frutas/vegetales', completed: false },
    { id: 4, name: 'Dormir 7-8 horas', completed: false },
  ]);

  const completedHabits = habits.filter(h => h.completed).length;
  const progressPercentage = (completedHabits / habits.length) * 100;

  const toggleHabit = (id: number) => {
    setHabits(habits.map(habit => 
      habit.id === id ? { ...habit, completed: !habit.completed } : habit
    ));
  };

  const handleStepsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Steps recorded:', steps);
    // TODO: Save steps to database
  };

  const handleNoteSave = () => {
    console.log('Note saved:', todayNote);
    // TODO: Save note to database
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Hola, {user?.full_name.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground">Sigue tus hábitos diarios y progreso</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Today's Habits */}
        <Card>
          <CardHeader>
            <CardTitle>Hábitos de Hoy</CardTitle>
            <CardDescription>
              {completedHabits} de {habits.length} completados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={progressPercentage} className="mb-4" />
              {habits.map((habit) => (
                <div key={habit.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`habit-${habit.id}`}
                    checked={habit.completed}
                    onCheckedChange={() => toggleHabit(habit.id)}
                  />
                  <Label 
                    htmlFor={`habit-${habit.id}`}
                    className={habit.completed ? 'line-through text-muted-foreground' : ''}
                  >
                    {habit.name}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Counter */}
        <Card>
          <CardHeader>
            <CardTitle>Contador de Pasos</CardTitle>
            <CardDescription>Registra tus pasos diarios</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStepsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="steps">Pasos de Hoy</Label>
                <Input
                  id="steps"
                  type="number"
                  placeholder="Ingresa el conteo de pasos"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Registrar Pasos
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Daily Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notas Diarias</CardTitle>
            <CardDescription>¿Cómo te sientes hoy?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note">Nota de Hoy</Label>
                <Input
                  id="note"
                  placeholder="Escribe sobre tu día..."
                  value={todayNote}
                  onChange={(e) => setTodayNote(e.target.value)}
                />
              </div>
              <Button onClick={handleNoteSave} className="w-full">
                Guardar Nota
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Training Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Plan de Entrenamiento</CardTitle>
            <CardDescription>Tu entrenamiento personalizado</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Aún no tienes un plan de entrenamiento asignado. Contacta a tu entrenador para comenzar.
            </p>
            <Button variant="outline" className="w-full">
              Ver Videos de Entrenamiento
            </Button>
          </CardContent>
        </Card>

        {/* Nutrition Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Nutricional</CardTitle>
            <CardDescription>Tu plan de alimentación personalizado</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Aún no tienes un plan nutricional asignado. Mejora a Premium para nutrición personalizada.
            </p>
            <Button variant="outline" className="w-full">
              Ver Planes
            </Button>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Progreso</CardTitle>
            <CardDescription>Tu resumen semanal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Hábitos completados esta semana</span>
                <span className="font-medium">18/28</span>
              </div>
              <div className="flex justify-between">
                <span>Promedio de pasos diarios</span>
                <span className="font-medium">7,842</span>
              </div>
              <div className="flex justify-between">
                <span>Días activos</span>
                <span className="font-medium">5/7</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
