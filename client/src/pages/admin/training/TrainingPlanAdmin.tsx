import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUsers } from '@/hooks/api/use-users';
import { 
  useTrainingPlan, 
  useEnsureDraftTrainingPlan,
  usePublishTrainingPlan 
} from '@/hooks/api/use-training-plan';
import TrainingPlanOverview from './TrainingPlanOverview';
import TrainingDayEditor from './TrainingDayEditor';
import { User, Dumbbell, Plus, Send, FileText } from 'lucide-react';

const TrainingPlanAdmin: React.FC = () => {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null);
  const [selectedDayId, setSelectedDayId] = React.useState<number | null>(null);

  // API hooks
  const { data: users } = useUsers();
  const { data: trainingData, isLoading: planLoading } = useTrainingPlan(selectedUserId || 0);
  const createDraftMutation = useEnsureDraftTrainingPlan(selectedUserId || 0);
  const publishPlanMutation = usePublishTrainingPlan(selectedUserId || 0);

  const handleUserSelect = (userId: string) => {
    const id = parseInt(userId);
    setSelectedUserId(id);
    setSelectedDayId(null); // Reset day selection when user changes
  };

  const handleCreateDraft = async () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Selecciona un usuario primero",
        variant: "destructive",
      });
      return;
    }

    try {
      await createDraftMutation.mutateAsync();
      toast({
        title: "Borrador creado",
        description: "Se ha creado un nuevo borrador del plan de entrenamiento",
        variant: "default",
      });
    } catch (error) {
      console.error('Error creating draft:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el borrador",
        variant: "destructive",
      });
    }
  };

  const handlePublishPlan = async () => {
    if (!selectedUserId || !trainingData?.plan?.id) {
      toast({
        title: "Error",
        description: "No hay plan para publicar",
        variant: "destructive",
      });
      return;
    }

    try {
      await publishPlanMutation.mutateAsync(trainingData.plan.id);
      toast({
        title: "¡Plan publicado!",
        description: "El plan de entrenamiento ha sido publicado exitosamente",
        variant: "default",
      });
    } catch (error) {
      console.error('Error publishing plan:', error);
      toast({
        title: "Error",
        description: "No se pudo publicar el plan",
        variant: "destructive",
      });
    }
  };

  const selectedUser = users?.find(u => u.id === selectedUserId);
  const plan = trainingData?.plan;
  const days = trainingData?.days || [];
  const selectedDay = days.find(d => d.id === selectedDayId);

  return (
    <div className="space-y-6">
      {/* User Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Seleccionar Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-select">Usuario</Label>
              <Select onValueChange={handleUserSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{user.full_name}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {user.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUser && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{selectedUser.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    <p className="text-sm">
                      Plan: <Badge variant="outline">{selectedUser.plan_type || 'Sin plan'}</Badge>
                    </p>
                  </div>
                  
                  {!plan ? (
                    <Button onClick={handleCreateDraft} disabled={createDraftMutation.isPending}>
                      <Plus className="w-4 h-4 mr-2" />
                      {createDraftMutation.isPending ? 'Creando...' : 'Crear Plan'}
                    </Button>
                  ) : (
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Estado: <Badge variant={plan.status === 'published' ? 'default' : 'secondary'}>
                          {plan.status === 'published' ? 'Publicado' : 'Borrador'}
                        </Badge>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Versión {plan.version}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Training Plan Content */}
      {selectedUserId && plan && (
        <>
          {/* Plan Overview or Day Editor */}
          {!selectedDayId ? (
            <>
              <TrainingPlanOverview
                plan={plan}
                days={days}
                userId={selectedUserId}
                onDaySelect={setSelectedDayId}
              />
              
              {/* Publish Button */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Publicar Plan</h3>
                      <p className="text-sm text-muted-foreground">
                        Una vez publicado, el usuario podrá ver este plan de entrenamiento
                      </p>
                    </div>
                    <Button 
                      onClick={handlePublishPlan}
                      disabled={publishPlanMutation.isPending || days.length === 0}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {publishPlanMutation.isPending ? 'Publicando...' : 'Publicar Plan'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <TrainingDayEditor
              day={selectedDay!}
              userId={selectedUserId}
              onBack={() => setSelectedDayId(null)}
            />
          )}
        </>
      )}

      {/* Legacy PDF Info */}
      {selectedUserId && trainingData?.legacyPdf && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">Plan PDF Existente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">{trainingData.legacyPdf.filename}</p>
                <p className="text-sm text-blue-600">
                  Subido el {new Date(trainingData.legacyPdf.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/api/files/${trainingData.legacyPdf.id}`, '_blank')}
                className="ml-auto"
              >
                Ver PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrainingPlanAdmin;
