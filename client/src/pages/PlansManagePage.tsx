import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Edit } from 'lucide-react';

interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  services_included: string[];
  is_active: boolean;
}

const PlansManagePage: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingPlan, setEditingPlan] = React.useState<Plan | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  React.useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      console.log('Fetching plans');
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/plans', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const plansData = await response.json();
        console.log('Plans fetched:', plansData.length);
        setPlans(plansData.map((plan: any) => ({
          ...plan,
          services_included: JSON.parse(plan.services_included),
          is_active: Boolean(plan.is_active)
        })));
      } else {
        console.error('Failed to fetch plans');
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan({ ...plan });
    setIsEditDialogOpen(true);
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;

    try {
      console.log('Saving plan changes:', editingPlan.id);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/plans/${editingPlan.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingPlan.name,
          description: editingPlan.description,
          price: editingPlan.price,
          services_included: editingPlan.services_included,
          is_active: editingPlan.is_active
        }),
      });

      if (response.ok) {
        const updatedPlan = await response.json();
        setPlans(plans.map(plan => 
          plan.id === updatedPlan.id ? {
            ...updatedPlan,
            services_included: JSON.parse(updatedPlan.services_included),
            is_active: Boolean(updatedPlan.is_active)
          } : plan
        ));
        setIsEditDialogOpen(false);
        setEditingPlan(null);
        console.log('Plan updated successfully');
      } else {
        console.error('Failed to update plan');
      }
    } catch (error) {
      console.error('Error updating plan:', error);
    }
  };

  const updateService = (index: number, value: string) => {
    if (!editingPlan) return;
    const newServices = [...editingPlan.services_included];
    newServices[index] = value;
    setEditingPlan({ ...editingPlan, services_included: newServices });
  };

  const addService = () => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      services_included: [...editingPlan.services_included, '']
    });
  };

  const removeService = (index: number) => {
    if (!editingPlan) return;
    const newServices = editingPlan.services_included.filter((_, i) => i !== index);
    setEditingPlan({ ...editingPlan, services_included: newServices });
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
        <h1 className="text-4xl font-bold mb-4">Nuestros Planes</h1>
        <p className="text-xl text-muted-foreground">
          Selecciona el plan perfecto para comenzar tu viaje hacia un estilo de vida saludable
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.filter(plan => plan.is_active).map((plan, index) => (
          <Card key={plan.id} className={`relative ${index === 1 ? 'border-primary shadow-lg' : ''}`}>
            {index === 1 && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm">
                  Más Popular
                </span>
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                  {plan.price > 0 && (
                    <div className="mt-2">
                      <span className="text-2xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/mes</span>
                    </div>
                  )}
                </div>
                {user?.role === 'admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPlan(plan)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {plan.services_included.map((service, serviceIndex) => (
                  <li key={serviceIndex} className="flex items-start space-x-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{service}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full" 
                variant={index === 1 ? "default" : "outline"}
              >
                {plan.price > 0 ? 'Suscribirse' : 'Comenzar'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Plan Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Plan</DialogTitle>
            <DialogDescription>
              Modifica los detalles del plan seleccionado
            </DialogDescription>
          </DialogHeader>
          
          {editingPlan && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="planName">Nombre del Plan</Label>
                <Input
                  id="planName"
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="planDescription">Descripción</Label>
                <Textarea
                  id="planDescription"
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({...editingPlan, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="planPrice">Precio (USD)</Label>
                <Input
                  id="planPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingPlan.price}
                  onChange={(e) => setEditingPlan({...editingPlan, price: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div className="space-y-2">
                <Label>Servicios Incluidos</Label>
                {editingPlan.services_included.map((service, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={service}
                      onChange={(e) => updateService(index, e.target.value)}
                      placeholder="Describe el servicio"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeService(index)}
                      disabled={editingPlan.services_included.length <= 1}
                    >
                      Eliminar
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addService}>
                  Agregar Servicio
                </Button>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSavePlan} className="flex-1">
                  Guardar Cambios
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlansManagePage;
