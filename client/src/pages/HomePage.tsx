import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const HomePage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Outdoor Team – Healthy Habits Academy
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Transform your lifestyle with personalized training plans, nutrition guidance, 
          and habit tracking. Join our community and build lasting healthy habits.
        </p>
        <Link to="/register">
          <Button size="lg" className="text-lg px-8 py-3">
            Start Your Journey Today
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mt-16">
        <Card>
          <CardHeader>
            <CardTitle>Personalized Training</CardTitle>
            <CardDescription>
              Get customized workout plans designed for your fitness level and goals
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Nutrition Guidance</CardTitle>
            <CardDescription>
              Professional nutrition plans by licensed nutritionist Ana Saloco
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Habit Tracking</CardTitle>
            <CardDescription>
              Build lasting healthy habits with our comprehensive tracking system
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="text-center mt-16">
        <Link to="/plans">
          <Button variant="outline" size="lg">
            View Our Plans
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
