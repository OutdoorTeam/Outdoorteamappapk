import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const PlansConfigurationPage: React.FC = () => {
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

  // Load plans
  const loadPlans = async () => {
    try {
      const data = await apiRequest<ServicePlan[]>('/api/admin/plans-management');
      setPlans(data);
      console.log('Plans loaded:', data);
    } catch (error) {
      const apiError = parseApiError(error);
      console.error('Error loading plans:', apiError);
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

  // Reset form
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

  // Handle create new plan
  const handleCreatePlan = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  // Handle edit plan
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

  // Add service
  const addService = () => {
    if (newService.trim() && !formData.services_included.includes(newService.trim())) {
      setFormData(prev => ({
        ...prev,
        services_included: [...prev.services_included, newService.trim()]
      }));
      setNewService('');
    }
  };

  // Remove service
  const removeService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services_included: prev.services_included.filter(s => s !== service)
    }));
  };

  // Save plan
  const handleSavePlan = async () => {
    try {
      if (!formData.name.trim()) {
        toast({
          title: "Error",
          description: "El nombre del plan es requerido",
          variant: "destructive",
        });
        return;
      }

      if (!formData.description.trim()) {
        toast({
          title: "Error",
          description: "La descripción del plan es requerida",
          variant: "destructive",
        });
        return;
      }

      if (formData.services_included.length === 0) {
        toast({
          title: "Error",
          description: "Debe incluir al menos un servicio",
          variant: "destructive",
        });
        return;
      }

      const requestData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: formData.price,
        services_included: formData.services_included,
        features_json: formData.features_json,
        is_active: formData.is_active
      };

      let savedPlan;
      if (editingPlan) {
        // Update existing plan
        savedPlan = await apiRequest<ServicePlan>(`/api/admin/plans-management/${editingPlan.id}`, {
          method: 'PUT',
          body: JSON.stringify(requestData),
        });
        
        setPlans(prev => prev.map(p => p.id === editingPlan.id ? savedPlan : p));
        
        toast({
          title: "Plan actualizado",
          description: `El plan "${savedPlan.name}" ha sido actualizado exitosamente`,
          variant: "default",
        });
      } else {
        // Create new plan
        savedPlan = await apiRequest<ServicePlan>('/api/admin/plans-management', {
          method: 'POST',
          body: JSON.stringify(requestData),
        });
        
        setPlans(prev => [...prev, savedPlan]);
        
        toast({
          title: "Plan creado",
          description: `El plan "${savedPlan.name}" ha sido creado exitosamente`,
          variant: "default",
        });
      }

      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      const apiError = parseApiError(error);
      console.error('Error saving plan:', apiError);
      toast({
        title: "Error",
        description: getErrorMessage(apiError),
        variant: "destructive",
      });
    }
  };

  // Delete plan
  const handleDeletePlan = async (plan: ServicePlan) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el plan "${plan.name}"?`)) {
      return;
    }

    try {
      await apiRequest(`/api/admin/plans-management/${plan.id}`, {
        method: 'DELETE',
      });

      setPlans(prev => prev.filter(p => p.id !== plan.id));
      
      toast({
        title: "Plan eliminado",
        description: `El plan "${plan.name}" ha sido eliminado exitosamente`,
        variant: "default",
      });
    } catch (error) {
      const apiError = parseApiError(error);
      console.error('Error deleting plan:', apiError);
      toast({
        title: "Error",
        description: getErrorMessage(apiError),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando configuración de planes...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Configuración de Planes</h1>
            <p className="text-muted-foreground">
              Administra los planes de servicio disponibles para los usuarios
            </p>
          </div>
          <Button onClick={handleCreatePlan}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Plan
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader>
              <div className="flex items