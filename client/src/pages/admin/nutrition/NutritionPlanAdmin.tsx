import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Eye, FileText, User } from 'lucide-react';
import { useUsers } from '@/hooks/api/use-users';
import { useNutritionPlan, useUpsertNutritionPlan } from '@/hooks/api/use-nutrition-plan';
import { useToast } from '@/hooks/use-toast';
import { markdownToSafeHtml } from '@/utils/markdown';

export const NutritionPlanAdmin: React.FC = () => {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null);
  const [content, setContent] = React.useState('');
  const [previewMode, setPreviewMode] = React.useState<'edit' | 'preview'>('edit');
  
  // Fetch users
  const { data: users, isLoading: usersLoading } = useUsers();
  
  // Fetch nutrition plan for selected user
  const { data: nutritionData, isLoading: planLoading } = useNutritionPlan(selectedUserId || 0);
  
  // Upsert mutation
  const upsertMutation = useUpsertNutritionPlan(selectedUserId || 0);

  // Update content when plan loads
  React.useEffect(() => {
    if (nutritionData?.plan?.content_md) {
      setContent(nutritionData.plan.content_md);
    } else {
      setContent('');
    }
  }, [nutritionData]);

  const handleSaveDraft = async () => {
    if (!selectedUserId) return;
    
    try {
      await upsertMutation.mutateAsync({
        content_md: content,
        status: 'draft'
      });
      
      toast({
        title: "Borrador guardado",
        description: "Los cambios se han guardado como borrador",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el borrador",
        variant: "destructive",
      });
    }
  };

  const handlePublish = async () => {
    if (!selectedUserId || !content.trim()) return;
    
    try {
      await upsertMutation.mutateAsync({
        content_md: content,
        status: 'published'
      });
      
      toast({
        title: "Plan publicado",
        description: "El plan nutricional ha sido publicado y es visible para el usuario",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo publicar el plan",
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

  return (
    <div className="space-y-6">
      {/* User Selection */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Seleccionar Usuario
        </label>
        <Select
          value={selectedUserId?.toString() || ''}
          onValueChange={(value) => setSelectedUserId(parseInt(value))}
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
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Editor */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Editor de Plan
                </CardTitle>
                <div className="flex items-center gap-2">
                  {nutritionData?.plan && getStatusBadge(nutritionData.plan.status)}
                  {nutritionData?.plan && (
                    <Badge variant="outline">v{nutritionData.plan.version}</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={previewMode === 'edit' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewMode('edit')}
                >
                  Editar
                </Button>
                <Button
                  variant={previewMode === 'preview' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewMode('preview')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Vista Previa
                </Button>
              </div>

              {previewMode === 'edit' ? (
                <div>
                  <Textarea
                    placeholder="Escribe el plan nutricional en formato Markdown..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[400px] font-mono text-sm"
                  />
                  <div className="mt-2 text-xs text-muted-foreground">
                    Usa formato Markdown: **negrita**, *cursiva*, # títulos, - listas, etc.
                  </div>
                </div>
              ) : (
                <div className="border rounded-md p-4 min-h-[400px] bg-muted/20">
                  {content.trim() ? (
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: markdownToSafeHtml(content) 
                      }}
                    />
                  ) : (
                    <p className="text-muted-foreground italic">
                      Vista previa aparecerá aquí...
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveDraft}
                  variant="outline"
                  disabled={!selectedUserId || upsertMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Borrador
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={!selectedUserId || !content.trim() || upsertMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Publicar Plan
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Plan Info & Legacy PDF */}
          <div className="space-y-4">
            {planLoading ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Cargando plan...</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Current Plan Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Estado Actual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {nutritionData?.plan ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Estado:</span>
                          {getStatusBadge(nutritionData.plan.status)}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Versión:</span>
                          <Badge variant="outline">v{nutritionData.plan.version}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Última actualización:</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(nutritionData.plan.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Contenido:</span>
                          <span className="text-sm text-muted-foreground">
                            {nutritionData.plan.content_md ? 'Con contenido' : 'Sin contenido'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No hay plan creado para este usuario</p>
                    )}
                  </CardContent>
                </Card>

                {/* Legacy PDF */}
                {nutritionData?.legacyPdf && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">PDF Legacy</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                        <FileText className="w-8 h-8 text-red-600" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{nutritionData.legacyPdf.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            Subido el {new Date(nutritionData.legacyPdf.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Este PDF se muestra como fallback cuando no hay contenido Markdown
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {!selectedUserId && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Selecciona un Usuario
            </h3>
            <p className="text-muted-foreground">
              Elige un usuario de la lista para gestionar su plan nutricional
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
