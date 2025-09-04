
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Star, Crown, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlans, Plan } from '@/hooks/api/use-plans';

const PlanIcon: React.FC<{ name: string }> = ({ name }) => {
  if (name.toLowerCase().includes('totum')) {
    return <Crown className="w-8 h-8 text-purple-600" />;
  }
  if (name.toLowerCase().includes('personalizado')) {
    return <Star className="w-8 h-8 text-blue-600" />;
  }
  return <Award className="w-8 h-8 text-green-600" />;
};

const getPlanColor = (name: string) => {
  if (name.toLowerCase().includes('totum')) return 'purple';
  if (name.toLowerCase().includes('personalizado')) return 'blue';
  return 'green';
};

const PlansPage: React.FC = () => {
  const { user } = useAuth();
  const { data: plans, isLoading, error } = usePlans();

  const getCardStyles = (name: string, isPopular?: boolean) => {
    const color = getPlanColor(name);
    const baseStyles = "relative transition-all hover:scale-105 h-full flex flex-col";
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

  const getIconBgColor = (name: string) => {
    const color = getPlanColor(name);
    const colors = {
      green: "bg-green-100",
      blue: "bg-blue-100",
      purple: "bg-purple-100"
    };
    return colors[color as keyof typeof colors];
  };

  const renderPlanCard = (plan: Plan) => {
    const services = plan.services_included || [];
    const isPopular = plan.name.toLowerCase().includes('totum');

    return (
      <Card key={plan.id} className={getCardStyles(plan.name, isPopular)}>
        {isPopular && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm flex items-center gap-1">
              <Star size={14} />
              Más Popular
            </span>
          </div>
        )}

        <CardHeader className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${getIconBgColor(plan.name)} flex items-center justify-center`}>
            <PlanIcon name={plan.name} />
          </div>
          <CardTitle className="text-2xl">{plan.name}</CardTitle>
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

        <CardContent className="flex flex-col flex-grow">
          <div className="mb-6 flex-grow">
            <h4 className="font-semibold mb-3">Servicios principales:</h4>
            <ul className="space-y-2">
              {services.map((service: string, serviceIndex: number) => (
                <li key={serviceIndex} className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <span className="text-sm">{service}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto">
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
                    variant={isPopular ? "default" : "outline"}
                  >
                    {user.plan_type === plan.name ? 'Plan Actual' : 'Seleccionar Plan'}
                  </Button>
                </Link>
              )
            ) : (
              <Link to="/register" className="block">
                <Button
                  className="w-full"
                  variant={isPopular ? "default" : "outline"}
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
          </div>
        </CardContent>
      </Card>
    );
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

      {isLoading && <div className="text-center">Cargando planes...</div>}
      {error && <div className="text-center text-red-500">Error al cargar los planes.</div>}

      <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans && plans.filter(p => p.is_active).map(renderPlanCard)}
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
