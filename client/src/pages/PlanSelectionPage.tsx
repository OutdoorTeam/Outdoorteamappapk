import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Star } from 'lucide-react';
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabaseClient';
import { toBool } from '@/utils/normalize';

type SubscriptionPlanRow = Database['public']['Tables']['subscription_plans']['Row'];

type PlanFeatures = {
  habits: boolean;
  training: boolean;
  nutrition: boolean;
  meditation: boolean;
  active_breaks: boolean;
};

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  features: PlanFeatures;
  services_included: string[];
  is_active: boolean;
};

const transformPlan = (plan: SubscriptionPlanRow): Plan => {
  const rawFeatures = (plan.features as Record<string, unknown>) ?? {};
  const features: PlanFeatures = {
    habits: toBool(rawFeatures.habits ?? true),
    training: toBool(rawFeatures.training),
    nutrition: toBool(rawFeatures.nutrition),
    meditation: toBool(rawFeatures.meditation),
    active_breaks: toBool(rawFeatures.active_breaks ?? rawFeatures.pause),
  };

  const servicesRaw = rawFeatures.services_included;
  const services = Array.isArray(servicesRaw) ? servicesRaw.map((item) => String(item)) : [];
  const isActive = toBool(rawFeatures.is_active ?? rawFeatures.active ?? true);

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: plan.price ?? 0,
    features,
    services_included: services,
    is_active: isActive,
  };
};

const PlanSelectionPage: React.FC = () => {
  const { user, assignPlan } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [assigningPlan, setAssigningPlan] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const fetchPlans = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .order('price', { ascending: true });
        if (error) {
          console.error('Error fetching subscription plans:', error.message);
          setPlans([]);
          return;
        }
        const parsed = (data ?? []).map(transformPlan).filter((plan) => plan.is_active);
        if (active) setPlans(parsed);
      } catch (err) {
        console.error('Unexpected error fetching plans:', err);
        if (active) setPlans([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchPlans();
    return () => {
      active = false;
    };
  }, []);

  const handleSelectPlan = async (planId: string) => {
    setAssigningPlan(planId);
    try {
      await assignPlan(planId);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error assigning plan:', error);
      alert('Error al seleccionar el plan. Por favor intenta de nuevo.');
    } finally {
      setAssigningPlan(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando planes...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">¡Bienvenido, {user?.full_name.split(' ')[0]}!</h1>
        <p className="text-xl text-muted-foreground">
          Selecciona tu plan para comenzar tu viaje hacia un estilo de vida saludable
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan, index) => {
          const isCurrentPlan = user?.plan_type === plan.name;
          return (
            <Card key={plan.id} className={`relative ${index === 1 ? 'border-primary shadow-lg scale-105' : ''}`}>
              {index === 1 && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm flex items-center gap-1">
                    <Star size={14} />
                    Más Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                {plan.price > 0 ? (
                  <div className="mt-2">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/mes</span>
                  </div>
                ) : (
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-green-600">Gratis</span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <h4 className="font-semibold mb-3">Características incluidas:</h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {plan.features.habits && (
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-green-500" />
                        <span>Seguimiento de hábitos diarios</span>
                      </div>
                    )}
                    {plan.features.training && (
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-green-500" />
                        <span>Entrenamientos personalizados</span>
                      </div>
                    )}
                    {plan.features.active_breaks && (
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-green-500" />
                        <span>Pausas activas</span>
                      </div>
                    )}
                    {plan.features.meditation && (
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-green-500" />
                        <span>Ejercicios de respiración</span>
                      </div>
                    )}
                    {plan.features.nutrition && (
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-green-500" />
                        <span>Plan de nutrición personalizado</span>
                      </div>
                    )}
                  </div>
                </div>

                {plan.services_included.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3">Servicios:</h4>
                    <ul className="space-y-2">
                      {plan.services_included.map((service, serviceIndex) => (
                        <li key={serviceIndex} className="flex items-start space-x-2">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{service}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  className="w-full"
                  variant={isCurrentPlan ? 'default' : index === 1 ? 'default' : 'outline'}
                  disabled={assigningPlan === plan.id}
                >
                  {assigningPlan === plan.id ? 'Seleccionando...' : isCurrentPlan ? 'Plan Actual' : plan.price > 0 ? 'Seleccionar Plan' : 'Comenzar Gratis'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center mt-12">
        <p className="text-muted-foreground mb-4">
          ¿Necesitas más información sobre nuestros planes?
        </p>
        <Button variant="outline" onClick={() => window.open('mailto:info@outdoorteam.com', '_blank')}>
          Contactar Soporte
        </Button>
      </div>
    </div>
  );
};

export default PlanSelectionPage;
