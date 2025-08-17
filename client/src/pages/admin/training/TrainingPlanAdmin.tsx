import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Dumbbell, User, FileText, Calendar } from 'lucide-react';
import { useUsers } from '@/hooks/api/use-users';
import { useTrainingPlan, useEnsureDraftTrainingPlan } from '@/hooks/api/use-training-plan';
import { useToast } from '@/hooks/use-toast';
import { TrainingDayEditor } from './TrainingDayEditor';
import { TrainingPlanOverview } from './TrainingPlanOverview';

export const TrainingPlanAdmin: React.FC = () => {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null);
  const [selectedDay, setSelectedDay] = React.useState<number>(1);
  
  // Fetch users
  const { data: users, isLoading: usersLoading } = useUsers();
  
  // Fetch training plan for selected user
  const { data: trainingData, isLoading: planLoading, refetch } = useTrainingPlan(selectedUserId || 0);
  
  // Create draft mutation
  const createDraftMutation = useEnsureDraftTrainingPlan(selectedUserId || 0);

  const handleCreateDraft = async () => {
    if (!selectedUserId) return;
    
    try {
      await createDraftMutation.mutateAsync();
      await refetch();
      toast({
        title: "Borrador creado",
        description: "Se ha creado un nuevo borrador del plan de entrenamiento",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el borrador",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800">Publicado</Badge>;
      case 'draft':
        return <Badge variant="secondary">Borrador</Badge>;
      default:
        return null;
    }
  };

  const availableDays = Array.from({ length: 7 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* User Selection */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Seleccionar Usuario
        </label>
        <Select
          value={selectedUserId?.toString() || ''}
          onValueChange={(value) => {
            setSelectedUserId(parseInt(value));
            setSelectedDay(1); // Reset to day 1 when changing users
          }}
          disabled={usersLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un usuario..." />
          </SelectTrigger>
          <SelectContent>
            {users?.map((user) => (
              <SelectItem key={user.id} value={user.id.toString()}>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {user.full_name} ({user.email})
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedUserId && (
        <>
          {/* Plan Status & Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="w-5 h-5" />
                  Plan de Entrenamiento
                </CardTitle>
                <div className="flex items-center gap-3">
                  {trainingData?.plan && getStatusBadge(trainingData.plan.status)}
                  {trainingData?.plan && (
                    <Badge variant="outline">v{trainingData.plan.version}</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {planLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Cargando plan...</p>
                </div>
              ) : trainingData?.plan ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{trainingData.plan.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Última actualización: {new Date(trainingData.plan.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Dumbbell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">
                    No hay plan de entrenamiento para este usuario
                  </p>
                  <Button
                    onClick={handleCreateDraft}
                    disabled={createDraftMutation.isPending}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Borrador
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan Editor */}
          {trainingData?.plan && (
            <Tabs value="editor" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="editor" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Editor por Días
                </TabsTrigger>
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Resumen General
                </TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="space-y-6">
                {/* Day Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Seleccionar Día</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                      {availableDays.map((day) => {
                        const dayData = trainingData.days.find(d => d.day_index === day);
                        const exerciseCount = dayData?.exercises?.length || 0;
                        
                        return (
                          <Button
                            key={day}
                            variant={selectedDay === day ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedDay(day)}
                            className="flex flex-col h-auto py-2"
                          >
                            <span className="font-medium">Día {day}</span>
                            <span className="text-xs opacity-70">
                              {exerciseCount} ej.
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Day Editor */}
                <TrainingDayEditor
                  planId={trainingData.plan.id}
                  dayIndex={selectedDay}
                  userId={selectedUserId}
                  existingDay={trainingData.days.find(d => d.day_index === selectedDay)}
                />
              </TabsContent>

              <TabsContent value="overview">
                <TrainingPlanOverview
                  plan={trainingData.plan}
                  days={trainingData.days}
                  userId={selectedUserId}
                  legacyPdf={trainingData.legacyPdf}
                />
              </TabsContent>
            </Tabs>
          )}

          {/* Legacy PDF Info */}
          {trainingData?.legacyPdf && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">PDF Legacy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                  <FileText className="w-8 h-8 text-red-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{trainingData.legacyPdf.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      Subido el {new Date(trainingData.legacyPdf.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Este PDF se muestra como fallback cuando no hay plan estructurado
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedUserId && (
        <Card>
          <CardContent className="text-center py-12">
            <Dumbbell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Selecciona un Usuario
            </h3>
            <p className="text-muted-foreground">
              Elige un usuario de la lista para gestionar su plan de entrenamiento
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
