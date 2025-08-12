import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';

const DashboardPage: React.FC = () => {
  const [steps, setSteps] = React.useState('');
  const [todayNote, setTodayNote] = React.useState('');
  const [habits, setHabits] = React.useState([
    { id: 1, name: 'Drink 8 glasses of water', completed: false },
    { id: 2, name: 'Exercise for 30 minutes', completed: true },
    { id: 3, name: 'Eat 5 servings of fruits/vegetables', completed: false },
    { id: 4, name: 'Get 7-8 hours of sleep', completed: false },
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
        <h1 className="text-3xl font-bold mb-2">Your Dashboard</h1>
        <p className="text-muted-foreground">Track your daily habits and progress</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Today's Habits */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Habits</CardTitle>
            <CardDescription>
              {completedHabits} of {habits.length} completed
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
            <CardTitle>Step Counter</CardTitle>
            <CardDescription>Record your daily steps</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStepsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="steps">Steps Today</Label>
                <Input
                  id="steps"
                  type="number"
                  placeholder="Enter step count"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Record Steps
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Daily Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Notes</CardTitle>
            <CardDescription>How are you feeling today?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note">Today's Note</Label>
                <Input
                  id="note"
                  placeholder="Write about your day..."
                  value={todayNote}
                  onChange={(e) => setTodayNote(e.target.value)}
                />
              </div>
              <Button onClick={handleNoteSave} className="w-full">
                Save Note
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Training Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Training Plan</CardTitle>
            <CardDescription>Your personalized workout</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              No training plan assigned yet. Contact your trainer to get started.
            </p>
            <Button variant="outline" className="w-full">
              View Training Videos
            </Button>
          </CardContent>
        </Card>

        {/* Nutrition Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Nutrition Plan</CardTitle>
            <CardDescription>Your personalized meal plan</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              No nutrition plan assigned yet. Upgrade to Premium for personalized nutrition.
            </p>
            <Button variant="outline" className="w-full">
              View Plans
            </Button>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Overview</CardTitle>
            <CardDescription>Your weekly summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Habits completed this week</span>
                <span className="font-medium">18/28</span>
              </div>
              <div className="flex justify-between">
                <span>Average daily steps</span>
                <span className="font-medium">7,842</span>
              </div>
              <div className="flex justify-between">
                <span>Active days</span>
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
