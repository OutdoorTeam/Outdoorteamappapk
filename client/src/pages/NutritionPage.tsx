import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const NutritionPage: React.FC = () => {
  const { user } = useAuth();
  const [userFiles, setUserFiles] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    fetchUserFiles();
  }, []);

  const fetchUserFiles = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/user-files', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const files = await response.json();
        setUserFiles(files.filter((file: any) => file.file_type === 'nutrition'));
      }
    } catch (error) {
      console.error('Error fetching user files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando plan nutricional...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Nutrición</h1>
        <p className="text-muted-foreground">Tu plan de nutrición personalizado por la Lic. Ana Saloco</p>
      </div>

      <div className="space-y-8">
        {/* Personalized Nutrition Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Tu Plan de Nutrición Personalizado</CardTitle>
            <CardDescription>Plan nutricional diseñado específicamente para tus objetivos y necesidades</CardDescription>
          </CardHeader>
          <CardContent>
            {userFiles.length > 0 ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Tu plan de nutrición ha sido creado por la Licenciada Ana Saloco, especialista en nutrición deportiva y hábitos saludables.
                </p>
                {userFiles.map((file: any) => (
                  <Card key={file.id} className="border border-primary/20">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <h4 className="font-medium">{file.filename}</h4>
                        <p className="text-sm text-muted-foreground">
                          Plan nutricional personalizado por Lic. Ana Saloco
                        </p>
                      </div>
                      <Button 
                        onClick={() => window.open(`/api/files/${file.id}`, '_blank')}
                        className="ml-4"
                      >
                        Ver Plan
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Aún no tienes un plan de nutrición personalizado asignado.
                </p>
                <p className="text-sm text-muted-foreground">
                  La Lic. Ana Saloco trabajará contigo para crear un plan nutricional adaptado a tus objetivos.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nutrition Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Consejos Nutricionales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-primary">Fundamentos Básicos</h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Mantén una hidratación adecuada (8-10 vasos de agua al día)</li>
                  <li>• Incluye proteínas en cada comida principal</li>
                  <li>• Consume 5 porciones de frutas y verduras diarias</li>
                  <li>• Elige carbohidratos complejos sobre simples</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-primary">Timing de Comidas</h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Desayuna dentro de 1 hora después de despertar</li>
                  <li>• Come cada 3-4 horas para mantener el metabolismo</li>
                  <li>• Consume proteínas post-entrenamiento</li>
                  <li>• Evita comidas pesadas 3 horas antes de dormir</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Healthy Recipes */}
        <Card>
          <CardHeader>
            <CardTitle>Recetas Saludables</CardTitle>
            <CardDescription>Ideas rápidas y nutritivas para tu día a día</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Desayuno Energético</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Avena con frutas y frutos secos
                </p>
                <ul className="text-xs text-muted-foreground">
                  <li>• 1/2 taza avena</li>
                  <li>• 1 plátano</li>
                  <li>• Almendras</li>
                  <li>• Canela</li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Almuerzo Balanceado</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Ensalada completa con proteína
                </p>
                <ul className="text-xs text-muted-foreground">
                  <li>• Vegetales verdes</li>
                  <li>• Pollo o pescado</li>
                  <li>• Quinoa</li>
                  <li>• Aceite de oliva</li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Snack Saludable</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Yogurt con semillas
                </p>
                <ul className="text-xs text-muted-foreground">
                  <li>• Yogurt griego</li>
                  <li>• Chía o lino</li>
                  <li>• Berries</li>
                  <li>• Miel natural</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NutritionPage;