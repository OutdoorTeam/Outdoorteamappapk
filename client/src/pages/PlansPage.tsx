import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

const PlansPage: React.FC = () => {
  const plans = [
    {
      name: "Healthy Habits Academy",
      type: "Standard",
      description: "Perfect for starting your healthy journey",
      features: [
        "Weekly training routine",
        "Habit tracking system", 
        "Step counter (manual input)",
        "Daily notes",
        "Progress tracking",
        "Active breaks videos"
      ]
    },
    {
      name: "Personalized Training + Academy",
      type: "Advanced",
      description: "Tailored training with personal support",
      features: [
        "Everything in Healthy Habits Academy",
        "Personalized training plan",
        "Training for gym, home, or any activity",
        "Weekly WhatsApp follow-up",
        "Daily questions via WhatsApp",
        "Access to 150+ exercise videos"
      ]
    },
    {
      name: "Program 'Totum'",
      type: "Premium",
      description: "Complete wellness transformation",
      features: [
        "Everything in Personalized Training + Academy",
        "Personalized nutrition plan by Lic. Ana Saloco",
        "Active breaks with guidance",
        "Complete health transformation program"
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Select the perfect plan to start your healthy lifestyle journey
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan, index) => (
          <Card key={index} className={`relative ${index === 1 ? 'border-primary shadow-lg' : ''}`}>
            {index === 1 && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm">
                  Most Popular
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription className="text-sm font-medium text-primary">
                {plan.type}
              </CardDescription>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start space-x-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register" className="block">
                <Button 
                  className="w-full" 
                  variant={index === 1 ? "default" : "outline"}
                >
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-12">
        <p className="text-muted-foreground mb-4">
          Ready to transform your lifestyle?
        </p>
        <Link to="/register">
          <Button size="lg">Start Your Journey</Button>
        </Link>
      </div>
    </div>
  );
};

export default PlansPage;
