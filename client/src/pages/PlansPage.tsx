import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Star, Crown, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const PlansPage: React.FC = () => {
  const { user } = useAuth();
  
  const plans = [
    {
      id: 1,
      name: "Healthy Habits Academy",
      type: "Estándar",
      description: "Perfecto para comenzar tu viaje saludable",
      price: 0,
      icon: Award,
      color: "green",
      features: [
        "Rutina de entrenamiento semanal",
        "Sistema de seguimiento de hábitos", 
        "Contador de pasos (entrada manual)",
        "Notas diarias",
        "Seguimiento de progreso",
        "Videos de pausas activas"
      ],
      services: [
        "Acceso a entrenamientos básicos",
        "Seguimiento de hábitos diarios",
        "Calendario de progreso",
        "Biblioteca de pausas activas"
      ]
    },
    {
      id: 2,
      name: "Programa Totum",
      type: "Premium",
      description: "Transformación completa del bienestar",
      price: 99,
      icon: Crown,
      color: "purple",
      popular: true,
      features: [
        "Todo lo incluido en Healthy Habits Academy",
        "Plan de entrenamiento personalizado",
        "Plan de nutrición personalizado por Lic. Ana Saloco",
        "Pausas activas con orientación",
        "Programa completo de transformación de la salud",
        "Acceso a ejercicios de respiración y meditación"
      ],
      services: [
        "Plan de entrenamiento 100% personalizado",
        "Plan nutricional por Lic. Ana Saloco",
        "Seguimiento completo de hábitos",
        "Ejercicios de meditación y respiración",
        "Pausas activas especializadas",
        "Soporte prioritario"
      ]
    },
    {
      id: 3,
      name: "Entrenamiento Personalizado",
      type: "Avanzado",
      description: "Entrenamiento personalizado con apoyo personal",
      price: 59,
      icon: Star,
      color: "blue",
      features: [
        "Todo lo incluido en Healthy Habits Academy",
        "Plan de entrenamiento personalizado",
        "Entrenamiento para gimnasio, hogar o cualquier actividad",
        "Seguimiento semanal por WhatsApp",
        "Preguntas diarias permitidas vía WhatsApp",
        "Acceso a más de 150 videos de ejercicios"
      ],
      services: [
        "Plan de entrenamiento personalizado",
        "Seguimiento por WhatsApp",
        "Videos de ejercicios especializados",
        "Consultas diarias permitidas",
        "Adaptación según disponibilidad"
      ]
    }
  ];

  const getCardStyles = (color: string, isPopular?: boolean) => {
    const baseStyles = "relative transition-all hover:scale-105";
    const colorStyles = {
      green: "border-green-200 hover:border-green-300",
      blue: "border-blue-200 hover:border-blue-300", 
      purple: "border-purple-200 hover:border-purple-300"
    };
    
    if (isPopular) {
      return `${baseStyles} ${colorStyles[color as keyof typeof colorStyles]} shadow-lg scale-105 border-2`;
    }
    
    return `${baseStyles} ${colorStyles[color as keyof typeof colorStyles]}`;
  };

  const getIconColor = (color: string) => {
    const colors = {
      green: "text-green-600",
      blue: "text-blue-600",
      purple: "text-purple-600"
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Nuestros Planes de Salud y Bienestar</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Selecciona el plan perfecto para comenzar tu viaje hacia un estilo de vida saludable. 
          Cada plan está diseñado para adaptarse a diferentes objetivos y necesidades.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card key={plan.id} className={getCardStyles(plan.color, plan.popular)}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm flex items-center gap-1">
                  <Star size={14} />
                  Más Popular
                </span>
              </div>
            )}
            
            <CardHeader className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-${plan.color}-100 flex items-center justify-center`}>
                <plan.icon className={`w-8 h-8 ${getIconColor(plan.color)}`} />
              </div>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription className={`text-sm font-medium text-${plan.color}-600`}>
                {plan.type}
              </CardDescription>
              <CardDescription className="mt-2">{plan.description}</CardDescription>
              
              <div className="mt-4">
                {plan.price > 0 ? (
                  <>
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/mes</span>
                  </>
                ) : (
                  <span className="text-4xl font-bold text-green-600">Gratis</span>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Lo que incluye:</h4>
                <ul className="space-y-2">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-2">
                      <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold mb-3">Servicios principales:</h4>
                <ul className="space-y-1">
                  {plan.services.map((service, serviceIndex) => (
                    <li key={serviceIndex} className="text-sm text-muted-foreground">
                      • {service}
                    </li>
                  ))}
                </ul>
              </div>

              {user ? (
                user.role === 'admin' ? (
                  <Button className="w-full" variant="outline">
                    <Link to="/admin" className="w-full">
                      Gestionar en Admin
                    </Link>
                  </Button>
                ) : (
                  <Link to="/plan-selection" className="block">
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {user.plan_type === plan.name ? 'Plan Actual' : 'Seleccionar Plan'}
                    </Button>
                  </Link>
                )
              ) : (
                <Link to="/register" className="block">
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.price > 0 ? 'Comenzar' : 'Comenzar Gratis'}
                  </Button>
                </Link>
              )}

              {plan.price > 0 && !user && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Contáctanos para información sobre pagos
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-16">
        <h2 className="text-2xl font-bold mb-4">¿Listo para transformar tu vida?</h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Únete a nuestra comunidad de personas comprometidas con su salud y bienestar. 
          Nuestros programas están diseñados por profesionales para garantizar resultados reales.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {!user ? (
            <>
              <Link to="/register">
                <Button size="lg" className="min-w-[200px]">
                  Comienza Tu Viaje
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => window.open('mailto:info@outdoorteam.com', '_blank')}
              >
                Contactar Soporte
              </Button>
            </>
          ) : (
            user.role !== 'admin' && (
              <Link to="/dashboard">
                <Button size="lg" className="min-w-[200px]">
                  Ir a Mi Dashboard
                </Button>
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default PlansPage;