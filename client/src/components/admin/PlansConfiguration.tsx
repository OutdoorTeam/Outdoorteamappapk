
import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, DollarSign, Package, Settings, Save, X } from 'lucide-react';
import { apiRequest, parseApiError, getErrorMessage } from '@/utils/error-handling';

interface ServicePlan {
  id: number;
  name: string;
  description: string;
  price: number;
  services_included: string[];
  features_json: {
    habits: boolean;
    training: boolean;
    nutrition: boolean;
    meditation: boolean;
    active_breaks: boolean;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PlanFormData {
  name: string;
  description: string;
  price: number;
  services_included: string[];
  features_json: {
    habits: boolean;
    training: boolean;
    nutrition: boolean;
    meditation: boolean;
    active_breaks: boolean;
  };
  is_active: boolean;
}

const PlansConfiguration: React.FC = () => {
  const { toast } = useToast();
  const [plans, setPlans] = React.useState<ServicePlan[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingPlan, setEditingPlan] = React.useState<ServicePlan | null>(null);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [formData, setFormData] = React.useState<PlanFormData>({
    name: '',
    description: '',
    price: 0,
    services_included: [],
    features_json: {
      habits: true,
      training: false,
      nutrition: false,
      meditation: false,
      active_breaks: false
    },
    is_active: true
  });
  const [newService, setNewService] = React.useState('');

  const loadPlans = async () => {
    try {
      const data = await apiRequest<ServicePlan[]>('/api/admin/plans-management');
      setPlans(data);
    } catch (error) {
      const apiError = parseApiError(error);
      toast({
        title: "Error",
        description: getErrorMessage(apiError),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadPlans();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      services_included: [],
      features_json: {
        habits: true,
        training: false,
        nutrition: false,
        meditation: false,
        active_breaks: false
      },
      is_active: true
    });
    setNewService('');
    setEditingPlan(null);
  };

  const handleCreatePlan = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleEditPlan = (plan: ServicePlan) => {
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      services_included: [...plan.services_included],
      features_json: { ...plan.features_json },
      is_active: plan.is_active
    });
    setEditingPlan(plan);
    setShowCreateDialog(true);
  };

  const addService = () => {
    if (newService.trim() && !formData.services_included.includes(newService.trim())) {
      setFormData(prev => ({
        ...prev,
        services_included: [...prev.services_included, newService.trim()]
      }));
      setNewService('');
    }
  };

  const removeService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services_included: prev.services_included.filter(s => s !== service)
    }));
  };

  const handleSavePlan = async () => {
    try {
      if (!formData.name.trim() || !formData.description.trim() || formData.services_included.length === 0) {
        toast({ title: "Error", description: "Por favor, completa todos los campos requeridos.", variant: "destructive" });
        return;
      }

      const requestData = { ...formData };
      let savedPlan;

      if (editingPlan) {
        savedPlan = await apiRequest<ServicePlan>(`/api/admin/plans-management/${editingPlan.id}`, {
          method: 'PUT',
          body: JSON.stringify(requestData),
        });
        setPlans(prev => prev.map(p => p.id === editingPlan.id ? savedPlan : p));
        toast({ title: "Plan actualizado", description: `El plan "${savedPlan.name}" ha sido actualizado.`, variant: "default" });
      } else {
        savedPlan = await apiRequest<ServicePlan>('/api/admin/plans-management', {
          method: 'POST',
          body: JSON.stringify(requestData),
        });
        setPlans(prev => [...prev, savedPlan]);
        toast({ title: "Plan creado", description: `El plan "${savedPlan.name}" ha sido creado.`, variant: "default" });
      }

      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      const apiError = parseApiError(error);
      toast({ title: "Error", description: getErrorMessage(apiError), variant: "destructive" });
    }
  };

  const handleDeletePlan = async (plan: ServicePlan) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el plan "${plan.name}"?`)) return;

    try {
      await apiRequest(`/api/admin/plans-management/${plan.id}`, { method: 'DELETE' });
      setPlans(prev => prev.filter(p => p.id !== plan.id));
      toast({ title: "Plan eliminado", description: `El plan "${plan.name}" ha sido eliminado.`, variant: "default" });
    } catch (error) {
      const apiError = parseApiError(error);
      toast({ title: "Error", description: getErrorMessage(apiError), variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando planes...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Gestión de Planes de Servicio
          </CardTitle>
          <Button onClick={handleCreatePlan}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Plan
          </Button>
        </div>
        <CardDescription>
          Crea, edita y elimina los planes de servicio que ofreces a los usuarios.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  <Badge variant={plan.is_active ? "default" : "destructive"}>
                    {plan.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-2xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
                <ul className="space-y-2 text-sm mb-4">
                  {plan.services_included.map((service, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {service}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)}>
                    <Edit className="w-4 h-4 mr-2" /> Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeletePlan(plan)}>
                    <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}</DialogTitle>
            <DialogDescription>
              {editingPlan ? 'Modifica los detalles del plan.' : 'Completa los detalles para el nuevo plan.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan-name">Nombre del Plan</Label>
                <Input id="plan-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-price">Precio</Label>
                <Input id="plan-price" type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-description">Descripción</Label>
              <Textarea id="plan-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Servicios Incluidos</Label>
              <div className="space-y-2">
                {formData.services_included.map((service, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={service} disabled />
                    <Button variant="ghost" size="icon" onClick={() => removeService(service)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input value={newService} onChange={(e) => setNewService(e.target.value)} placeholder="Nuevo servicio" />
                <Button onClick={addService}>Agregar</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Características</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(formData.features_json).map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <Switch
                      id={`feature-${key}`}
                      checked={formData.features_json[key as keyof typeof formData.features_json]}
                      onCheckedChange={(checked) => setFormData({ ...formData, features_json: { ...formData.features_json, [key]: checked } })}
                    />
                    <Label htmlFor={`feature-${key}`}>{key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="plan-active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
              <Label htmlFor="plan-active">Plan Activo</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
              <Button onClick={handleSavePlan}>
                <Save className="w-4 h-4 mr-2" />
                Guardar Plan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PlansConfiguration;
