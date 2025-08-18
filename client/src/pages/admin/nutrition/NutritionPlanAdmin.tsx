import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useUsers } from '@/hooks/api/use-users';
import { useNutritionPlan, useUpsertNutritionPlan } from '@/hooks/api/use-nutrition-plan';
import { markdownToSafeHtml } from '@/utils/markdown';
import { Eye, Save, Send, FileText, User } from 'lucide-react';

const NutritionPlanAdmin: React.FC = () => {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null);
  const [markdownContent, setMarkdownContent] = React.useState('');

  // Fetch users and nutrition plan data
  const { data: users } = useUsers();
  const { data: nutritionData, isLoading: planLoading } = useNutritionPlan(selectedUserId || 0);
  const upsertPlanMutation = useUpsertNutritionPlan(selectedUserId || 0);

  // Update content when plan data changes - fixed dependency array
  React.useEffect(() => {
    if (nutritionData?.plan?.content_md) {
      setMarkdownContent(nutritionData.plan.content_md);
    } else {
      setMarkdownContent('');
    }
  }, [nutritionData?.plan?.content_md]);

  const handleUserSelect = (userId: string) => {
    const id = parseInt(userId);
    setSelectedUserId(id);
  };

  const handleSaveDraft = async () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Selecciona un usuario primero",
        variant: "destructive",
      });
      return;
    }

    try {
      await upsertPlanMutation.mutateAsync({
        content_md: markdownContent,
        status: 'draft'
      });

      toast({
        title: "Borrador guardado",
        description: "El plan nutricional se ha guardado como borrador",
        variant: "default",
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el borrador",
        variant: "destructive",
      });
    }
  };

  const handlePublish = async () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Selecciona un usuario primero",
        variant: "destructive",
      });
      return;
    }

    if (!markdownContent.trim()) {
      toast({
        title: "Error",
        description: "El contenido no puede estar vacío para publicar",
        variant: "destructive",
      });
      return;
    }

    try {
      await upsertPlanMutation.mutateAsync({
        content_md: markdownContent,
        status: 'published'
      });

      toast({
        title: "¡Plan publicado!",
        description: "El plan nutricional ha sido publicado exitosamente",
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
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-medium">{selectedUser.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    <span className="text-sm">
                      Plan: <Badge variant="outline">{selectedUser.plan_type || 'Sin plan'}</Badge>
                    </span>
                  </div>
                  {nutritionData?.plan && (
                    <div className="ml-auto text-right">
                      <span className="text-sm font-medium">
                        Estado: <Badge variant={nutritionData.plan.status === 'published' ? 'default' : 'secondary'}>
                          {nutritionData.plan.status === 'published' ? 'Publicado' : 'Borrador'}
                        </Badge>
                      </span>
                      <div className="text-sm text-muted-foreground">
                        Versión {nutritionData.plan.version}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedUserId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Editor de Plan Nutricional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="editor" className="space-y-4">
              <TabsList>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="preview">Vista Previa</TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="space-y-4">
                <div>
                  <Label htmlFor="content">Contenido (Markdown)</Label>
                  <Textarea
                    id="content"
                    value={markdownContent}
                    onChange={(e) => setMarkdownContent(e.target.value)}
                    placeholder="# Plan Nutricional&#10;&#10;## Desayuno&#10;- Avena con frutas&#10;- Té verde&#10;&#10;## Almuerzo&#10;- Pollo a la plancha&#10;- Ensalada mixta&#10;- Arroz integral"
                    rows={20}
                    className="font-mono text-sm"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Usa formato Markdown. Ejemplo: # Título, ## Subtítulo, - Lista, **negrita**, *cursiva*
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <div className="border rounded-lg p-6 min-h-[400px] bg-white">
                  {markdownContent.trim() ? (
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: markdownToSafeHtml(markdownContent) 
                      }}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground py-12">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <span>Escribe contenido en el editor para ver la vista previa</span>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSaveDraft}
                variant="outline"
                disabled={upsertPlanMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {upsertPlanMutation.isPending ? 'Guardando...' : 'Guardar Borrador'}
              </Button>
              <Button
                onClick={handlePublish}
                disabled={upsertPlanMutation.isPending || !markdownContent.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                {upsertPlanMutation.isPending ? 'Publicando...' : 'Publicar Plan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legacy PDF Info */}
      {selectedUserId && nutritionData?.legacyPdf && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">Plan PDF Existente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <div className="font-medium text-blue-800">{nutritionData.legacyPdf.filename}</div>
                <div className="text-sm text-blue-600">
                  Subido el {new Date(nutritionData.legacyPdf.created_at).toLocaleDateString()}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/api/files/${nutritionData.legacyPdf.id}`, '_blank')}
                className="ml-auto"
              >
                Ver PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Guía de Markdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Formato básico:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><code># Título</code> → Título principal</li>
                <li><code>## Subtítulo</code> → Subtítulo</li>
                <li><code>**texto**</code> → <strong>texto en negrita</strong></li>
                <li><code>*texto*</code> → <em>texto en cursiva</em></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Listas y más:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><code>- Item</code> → Lista con viñetas</li>
                <li><code>1. Item</code> → Lista numerada</li>
                <li><code>---</code> → Línea separadora</li>
                <li><code>&gt; Cita</code> → Texto citado</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NutritionPlanAdmin;
