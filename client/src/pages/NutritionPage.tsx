import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Apple, FileText, Eye, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTodayHabits, useUpdateHabit } from '@/hooks/api/use-daily-habits';
import { useNutritionPlan } from '@/hooks/api/use-nutrition-plan';
import { markdownToSafeHtml } from '@/utils/markdown';
import PDFViewer from '@/components/PDFViewer';

const NutritionPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPDFViewer, setShowPDFViewer] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<any>(null);
  
  // Check if user has access to nutrition features
  const hasNutritionAccess = user?.features?.nutrition || false;
  
  // Fetch user's nutrition plan
  const { data: nutritionData, isLoading: planLoading } = useNutritionPlan(user?.id || 0);
  
  // Daily habits for completion tracking
  const { data: todayHabits } = useTodayHabits();
  const updateHabitMutation = useUpdateHabit();

  const handleCompleteNutrition = async () => {
    try {
      await updateHabitMutation.mutateAsync({
        date: new Date().toISOString().split('T')[0],
        nutrition_completed: !todayHabits?.nutrition_completed
      });
      
      toast({
        title: todayHabits?.nutrition_completed ? "Nutrición marcada como no completada" : "¡Nutrición completada!",
        description: todayHabits?.nutrition_completed ? 
          "Has desmarcado la nutrición de hoy" : 
          "¡Excelente! Has seguido tu plan nutricional hoy.",
        variant: "success",
      });
    } catch (error) {
      console.error('Error updating nutrition completion:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la nutrición",
        variant: "destructive",
      });
    }
  };

  const handleViewPlan = (file: any) => {
    setSelectedFile(file);
    setShowPDFViewer(true);
  };

  if (!hasNutritionAccess) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Apple className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-600 mb-4">Acceso a Nutrición No Disponible</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            La función de nutrición no está incluida en tu plan actual. 
            Actualiza tu plan para acceder a esta funcionalidad.
          </p>
          <Button 
            onClick={() => window.location.href = '/plans'}
            className="bg-[#D3B869] hover:bg-[#D3B869]/90 text-black"
          >
            Ver Planes Disponibles
          </Button>
        </div>
      </div>
    );
  }

  if (planLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando tu plan nutricional...</p>
        </div>
      </div>
    );
  }

  if (showPDFViewer && selectedFile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setShowPDFViewer(false)}
            className="mb-4"
          >
            ← Volver al Plan
          </Button>
        </div>
        <PDFViewer 
          fileId={selectedFile.id}
          filename={selectedFile.filename}
          onClose={() => setShowPDFViewer(false)}
        />
      </div>
    );
  }

  const nutritionPlan = nutritionData?.plan;
  const legacyPdf = nutritionData?.legacyPdf;
  const hasMarkdownContent = nutritionPlan?.content_md && nutritionPlan.content_md.trim();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Apple className="w-8 h-8 text-[#D3B869]" />
            <div>
              <h1 className="text-3xl font-bold">Nutrición</h1>
              <p className="text-muted-foreground">Tu plan nutricional personalizado</p>
            </div>
          </div>
          
          {/* Completion Toggle */}
          <Button
            onClick={handleCompleteNutrition}
            variant={todayHabits?.nutrition_completed ? "default" : "outline"}
            className={
              todayHabits?.nutrition_completed
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "border-[#D3B869] text-[#D3B869] hover:bg-[#D3B869] hover:text-black"
            }
            disabled={updateHabitMutation.isPending}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {todayHabits?.nutrition_completed ? "Completado Hoy" : "Marcar Completado"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {hasMarkdownContent ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Mi Plan Nutricional
            </CardTitle>
            <CardDescription>
              Plan personalizado - Versión {nutritionPlan.version} • {nutritionPlan.status === 'published' ? 'Publicado' : 'Borrador'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: markdownToSafeHtml(nutritionPlan.content_md) 
              }}
            />
          </CardContent>
        </Card>
      ) : legacyPdf ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Mi Plan Nutricional (PDF)
            </CardTitle>
            <CardDescription>
              Plan en formato PDF subido por tu entrenador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <FileText className="w-12 h-12 text-red-600" />
              <div className="flex-1">
                <h3 className="font-medium">{legacyPdf.filename}</h3>
                <p className="text-sm text-muted-foreground">
                  Subido el {new Date(legacyPdf.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button 
                onClick={() => handleViewPlan(legacyPdf)}
                className="bg-[#D3B869] hover:bg-[#D3B869]/90 text-black"
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Apple className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              No hay plan nutricional disponible
            </h3>
            <p className="text-muted-foreground mb-6">
              Tu entrenador aún no ha creado tu plan nutricional personalizado.
            </p>
            <div className="text-sm text-muted-foreground">
              <p>Mientras tanto, puedes:</p>
              <ul className="mt-2 space-y-1">
                <li>• Mantener hábitos alimentarios saludables</li>
                <li>• Beber suficiente agua durante el día</li>
                <li>• Contactar a tu entrenador si tienes dudas</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">💡 Consejos de Nutrición</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Hidratación</h4>
              <p className="text-muted-foreground">
                Bebe al menos 2-3 litros de agua al día, especialmente antes, durante y después del ejercicio.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Timing</h4>
              <p className="text-muted-foreground">
                Come una comida balanceada 2-3 horas antes del entrenamiento y un snack ligero después.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Proteínas</h4>
              <p className="text-muted-foreground">
                Incluye proteínas en cada comida para mantener la masa muscular y acelerar la recuperación.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Variedad</h4>
              <p className="text-muted-foreground">
                Come una variedad de colores en frutas y verduras para obtener todos los nutrientes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NutritionPage;
