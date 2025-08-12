import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

const PlansPage: React.FC = () => {
  const plans = [
    {
      name: "Healthy Habits Academy",
      type: "Estándar",
      description: "Perfecto para comenzar tu viaje saludable",
      features: [
        "Rutina de entrenamiento semanal",
        "Sistema de seguimiento de hábitos", 
        "Contador de pasos (entrada manual)",
        "Notas diarias",
        "Seguimiento de progreso",
        "Videos de pausas activas"
      ]
    },
    {
      name: "Entrenamiento Personalizado + Academy",
      type: "Avanzado",
      description: "Entrenamiento personalizado con apoyo personal",
      features: [
        "Todo lo incluido en Healthy Habits Academy",
        "Plan de entrenamiento personalizado",
        "Entrenamiento para gimnasio, hogar o cualquier actividad",
        "Seguimiento semanal por WhatsApp",
        "Preguntas diarias permitidas vía WhatsApp",
        "Acceso a más de 150 videos de ejercicios"
      ]
    },
    {
      name: "Programa 'Totum'",
      type: "Premium",
      description: "Transformación completa del bienestar",
      features: [
        "Todo lo incluido en Entrenamiento Personalizado + Academy",
        "Plan de nutrición personalizado por Lic. Ana Saloco",
        "Pausas activas con orientación",
        "Programa completo de transformación de la salud"
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Elige Tu Plan</h1>
        <p className="text-xl text-muted-foreground">
          Selecciona el plan perfecto para comenzar tu viaje hacia un estilo de vida saludable
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan, index) => (
          <Card key={index} className={`relative ${index === 1 ? 'border-primary shadow-lg' : ''}`}>
            {index === 1 && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm">
                  Más Popular
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
                  Comenzar
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-12">
        <p className="text-muted-foreground mb-4">
          ¿Listo para transformar tu estilo de vida?
        </p>
        <Link to="/register">
          <Button size="lg">Comienza Tu Viaje</Button>
        </Link>
      </div>
    </div>
  );
};

export default PlansPage;
