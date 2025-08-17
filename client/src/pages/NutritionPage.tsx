import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Apple, FileText, Eye, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserFiles } from '@/hooks/api/use-user-files';
import { useDailyHabits } from '@/hooks/api/use-daily-habits';
import PDFViewer from '@/components/PDFViewer';

const NutritionPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPDFViewer, setShowPDFViewer] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<any>(null);
  
  // Check if user has access to nutrition features
  const hasNutritionAccess = user?.features?.nutrition || false;
  
  // Fetch user's nutrition files
  const { data: userFiles, isLoading: filesLoading } = useUserFiles('nutrition');
  
  // Daily habits for completion tracking
  const { data: todayHabits, mutate: updateHabits } = useDailyHabits();

  const handleCompleteNutrition = async () => {
    try {
      await updateHabits({
        date: new Date().toISOString().split('T')[0],
        nutrition_completed: !todayHabits?.nutrition_completed
      });
      
      toast({
        title: todayHabits?.nutrition_completed ? "Nutrición marcada como no completada" : "¡Nutrición completada!",
        description: todayHabits?.nutrition_completed ? 
          "Has desmarcado la nutrición de hoy" : 
          "¡Excelente! Has seguido tu plan nutricional hoy.",
        variant: "default",
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
          <h2 className="text-2xl font-bold text-gray-600 mb-4">Acceso a Nutrición</h2>
          <p className="text-muted-foreground mb-6">
            Tu plan actual no incluye acceso a la sección de nutrición.
          </p>
          <p className="text-sm text-muted-foreground">
            Contacta al administrador para actualizar tu plan y acceder a esta funcionalidad.
          </p>
        </div>
      </div>
    );
  }

  if (showPDFViewer && selectedFile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PDFViewer
          fileId={selectedFile.id}
          filename={selectedFile.filename}
          onClose={() => {
            setShowPDFViewer(false);
            setSelectedFile(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Nutrición</h1>
        <p className="text-muted-foreground">
          Accede a tu plan nutricional personalizado y controla tu alimentación diaria
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Nutrition Completion Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Apple className="w-5 h-5" />
              Nutrición de Hoy
            </CardTitle>
            <CardDescription>
              Marca cuando hayas seguido tu plan nutricional del día
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
                  todayHabits?.nutrition_completed ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {todayHabits?.nutrition_completed ? (
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  ) : (
                    <Apple className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <p className="font-medium mb-2">
                  {todayHabits?.nutrition_completed ? '¡Plan seguido!' : 'Plan pendiente'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {todayHabits?.nutrition_completed ? 
                    'Has seguido tu plan nutricional correctamente' : 
                    'Sigue tu plan nutricional para mantener una alimentación saludable'}
                </p>
              </div>
              
              <Button 
                onClick={handleCompleteNutrition}
                className="w-full"
                variant={todayHabits?.nutrition_completed ? "outline" : "default"}
              >
                {todayHabits?.nutrition_completed ? 'Marcar como no seguido' : 'Marcar como seguido'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Nutrition Plan Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Mi Plan de Nutrición
            </CardTitle>
            <CardDescription>
              Accede a tu plan nutricional personalizado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Cargando plan nutricional...</p>
              </div>
            ) : userFiles && userFiles.length > 0 ? (
              <div className="space-y-3">
                {userFiles.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium">{file.filename}</p>
                        <p className="text-sm text-muted-foreground">
                          Plan de Nutrición • {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewPlan(file)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Plan
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No tienes planes asignados</h3>
                <p className="text-muted-foreground">
                  Tu plan nutricional personalizado aparecerá aquí una vez que sea asignado por el administrador.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Nutrition Tips Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Apple className="w-5 h-5" />
            Consejos Nutricionales
          </CardTitle>
          <CardDescription>
            Recomendaciones generales para mantener una alimentación saludable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Apple className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-medium mb-2">Hidratación</h4>
              <p className="text-sm text-muted-foreground">
                Bebe al menos 8 vasos de agua al día para mantener tu cuerpo hidratado
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Apple className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-medium mb-2">Porciones</h4>
              <p className="text-sm text-muted-foreground">
                Controla las porciones para mantener un equilibrio calórico adecuado
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Apple className="w-6 h-6 text-orange-600" />
              </div>
              <h4 className="font-medium mb-2">Variedad</h4>
              <p className="text-sm text-muted-foreground">
                Incluye diferentes grupos de alimentos para obtener todos los nutrientes
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Apple className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-medium mb-2">Horarios</h4>
              <p className="text-sm text-muted-foreground">
                Mantén horarios regulares de comida para regular tu metabolismo
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Apple className="w-6 h-6 text-red-600" />
              </div>
              <h4 className="font-medium mb-2">Procesados</h4>
              <p className="text-sm text-muted-foreground">
                Limita el consumo de alimentos ultraprocesados y azúcares añadidos
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Apple className="w-6 h-6 text-yellow-600" />
              </div>
              <h4 className="font-medium mb-2">Planificación</h4>
              <p className="text-sm text-muted-foreground">