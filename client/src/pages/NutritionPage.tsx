import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Apple, FileText, Eye, Download, User, ChefHat, Utensils, Leaf } from 'lucide-react';
import { useUserFiles } from '@/hooks/api/use-user-files';
import PDFViewer from '@/components/PDFViewer';

const NutritionPage: React.FC = () => {
  const { user } = useAuth();
  const [showPDFViewer, setShowPDFViewer] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<any>(null);
  
  // Use React Query hook for nutrition files
  const { data: nutritionFiles = [], isLoading } = useUserFiles('nutrition');

  const handleViewPDF = (file: any) => {
    setSelectedFile(file);
    setShowPDFViewer(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando área de nutrición...</div>
      </div>
    );
  }

  if (showPDFViewer && selectedFile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PDFViewer 
          fileId={selectedFile.id} 
          filename={selectedFile.filename}
          onClose={() => setShowPDFViewer(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Apple className="w-8 h-8 text-green-600" />
          Área de Nutrición
        </h1>
        <p className="text-muted-foreground">
          Tu guía personalizada para una alimentación saludable y equilibrada
        </p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Personalized Nutrition Plan */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-green-500" />
              <CardTitle className="text-green-500">Tu Plan de Nutrición Personalizado</CardTitle>
            </div>
            <CardDescription>
              Plan alimentario diseñado específicamente para tus objetivos, preferencias y estilo de vida
            </CardDescription>
          </CardHeader>
          <CardContent>
            {nutritionFiles.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Plan Nutricional Disponible</h4>
                  <p className="text-green-700 text-sm mb-3">
                    Nuestro equipo nutricional ha creado un plan específico basado en tus objetivos, 
                    preferencias alimentarias y necesidades nutricionales.
                  </p>
                </div>
                
                {nutritionFiles.map((file: any) => (
                  <Card key={file.id} className="border-green-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <FileText className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-green-800">Plan de Nutrición</h4>
                            <p className="text-sm text-green-600">
                              Subido el {new Date(file.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleViewPDF(file)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Mi Plan
                          </Button>
                          <Button
                            onClick={() => window.open(`/api/files/${file.id}`, '_blank')}
                            variant="outline"
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Descargar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
                <ChefHat className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-green-600 mb-2">
                  Plan Nutricional En Proceso
                </h3>
                <p className="text-green-600 mb-6 max-w-md mx-auto">
                  Nuestro equipo de nutricionistas está preparando tu plan alimentario personalizado. 
                  Te notificaremos cuando esté listo.
                </p>
                <div className="bg-green-100 p-4 rounded-lg max-w-md mx-auto">
                  <h4 className="font-semibold text-green-800 mb-2">Mientras tanto:</h4>
                  <ul className="text-sm text-green-700 text-left space-y-1">
                    <li>✓ Mantén una hidratación adecuada</li>
                    <li>✓ Incluye frutas y verduras en cada comida</li>
                    <li>✓ Evita alimentos ultraprocesados</li>
                    <li>✓ Registra tu progreso diario</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Nutrition Tips */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-orange-500" />
              <CardTitle className="text-orange-500">Consejos Nutricionales</CardTitle>
            </div>
            <CardDescription>
              Recomendaciones generales para mantener una alimentación saludable
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-lg">💧</span>
                    </div>
                    <h4 className="font-semibold text-blue-800">Hidratación</h4>
                  </div>
                  <p className="text-sm text-blue-700">
                    Bebe al menos 2-3 litros de agua al día. La hidratación es fundamental 
                    para el metabolismo y la eliminación de toxinas.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Leaf className="w-5 h-5 text-green-600" />
                    </div>
                    <h4 className="font-semibold text-green-800">Vegetales</h4>
                  </div>
                  <p className="text-sm text-green-700">
                    Incluye 5-7 porciones de frutas y verduras diariamente. 
                    Aportan vitaminas, minerales y antioxidantes esenciales.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 text-lg">⏰</span>
                    </div>
                    <h4 className="font-semibold text-purple-800">Horarios</h4>
                  </div>
                  <p className="text-sm text-purple-700">
                    Mantén horarios regulares de comida. Come cada 3-4 horas 
                    para mantener estables los niveles de energía.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 text-lg">🥜</span>
                    </div>
                    <h4 className="font-semibold text-orange-800">Proteínas</h4>
                  </div>
                  <p className="text-sm text-orange-700">
                    Incluye proteínas de calidad en cada comida: carnes magras, 
                    pescado, huevos, legumbres y frutos secos.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-yellow-600 text-lg">🍞</span>
                    </div>
                    <h4 className="font-semibold text-yellow-800">Carbohidratos</h4>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Elige carbohidratos complejos: avena, quinoa, arroz integral. 
                    Evita azúcares refinados y harinas procesadas.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 text-lg">🥑</span>
                    </div>
                    <h4 className="font-semibold text-red-800">Grasas Saludables</h4>
                  </div>
                  <p className="text-sm text-red-700">
                    Incluye grasas saludables: aguacate, frutos secos, aceite de oliva, 
                    pescados grasos. Son esenciales para la salud hormonal.
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Meal Planning */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <ChefHat className="w-5 h-5" />
              Planificación de Comidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded-lg border border-green-100">
                <span className="text-2xl mb-2 block">🌅</span>
                <h4 className="font-semibold text-green-800">Desayuno</h4>
                <p className="text-sm text-green-600">
                  Proteína + carbohidrato complejo + fruta
                </p>
              </div>
              
              <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
                <span className="text-2xl mb-2 block">☀️</span>
                <h4 className="font-semibold text-blue-800">Almuerzo</h4>
                <p className="text-sm text-blue-600">
                  Proteína + vegetales + carbohidrato + grasa saludable
                </p>
              </div>
              
              <div className="text-center p-4 bg-white rounded-lg border border-orange-100">
                <span className="text-2xl mb-2 block">🥗</span>
                <h4 className="font-semibold text-orange-800">Merienda</h4>
                <p className="text-sm text-orange-600">
                  Fruta + frutos secos o yogur natural
                </p>
              </div>
              
              <div className="text-center p-4 bg-white rounded-lg border border-purple-100">
                <span className="text-2xl mb-2 block">🌙</span>
                <h4 className="font-semibold text-purple-800">Cena</h4>
                <p className="text-sm text-purple-600">
                  Proteína magra + vegetales + mínimo carbohidrato
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NutritionPage;