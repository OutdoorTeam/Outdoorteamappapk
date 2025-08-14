import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Download, User, Apple, Clock, Utensils } from "lucide-react";
import { useUserFiles } from "@/hooks/api/use-user-files";

const NutritionPage: React.FC = () => {
  const { user } = useAuth();
  
  // Use React Query hook
  const { data: userFiles = [], isLoading } = useUserFiles('nutrition');

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
        <p className="text-muted-foreground">
          Tu plan de nutrición personalizado por la Lic. Ana Saloco
        </p>
      </div>

      <div className="space-y-8">
        {/* Personalized Nutrition Plan - Main Section */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Apple className="w-6 h-6 text-green-500" />
              <CardTitle className="text-green-600">
                Tu Plan de Nutrición Personalizado
              </CardTitle>
            </div>
            <CardDescription>
              Plan nutricional diseñado específicamente para tus objetivos y
              necesidades por la Lic. Ana Saloco
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userFiles.length > 0 ? (
              <div className="space-y-6">
                {/* Professional Info */}
                <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-800 text-lg">
                        Lic. Ana Saloco
                      </h3>
                      <p className="text-green-700 mb-2">
                        Nutricionista Especializada
                      </p>
                      <p className="text-sm text-green-600">
                        Especialista en nutrición deportiva, hábitos saludables
                        y planes alimentarios personalizados. Con años de
                        experiencia ayudando a personas a alcanzar sus objetivos
                        de salud y bienestar.
                      </p>
                    </div>
                  </div>
                </div>

                {/* User Files */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Tu Plan Nutricional</h4>
                  {userFiles.map((file: any) => (
                    <Card
                      key={file.id}
                      className="border-2 border-green-200 hover:border-green-300 transition-colors"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center">
                              <FileText className="w-7 h-7 text-green-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg">
                                {file.filename}
                              </h4>
                              <p className="text-sm text-muted-foreground mb-1">
                                Plan nutricional personalizado por Lic. Ana
                                Saloco
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Creado:{" "}
                                {new Date(file.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              onClick={() =>
                                window.open(`/api/files/${file.id}`, "_blank")
                              }
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <FileText size={16} className="mr-2" />
                              Ver Plan
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = `/api/files/${file.id}`;
                                link.download = file.filename;
                                link.click();
                              }}
                              className="border-green-600 text-green-600 hover:bg-green-50"
                            >
                              <Download size={16} className="mr-2" />
                              Descargar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Implementation Tips */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-3">
                    📋 Consejos para Seguir tu Plan
                  </h4>
                  <ul className="text-blue-700 text-sm space-y-2">
                    <li>• Lee completamente tu plan antes de comenzar</li>
                    <li>• Planifica tus comidas con anticipación</li>
                    <li>• Haz una lista de compras basada en tu plan</li>
                    <li>• Mantén un registro de lo que comes diariamente</li>
                    <li>
                      • No dudes en consultar dudas con la Lic. Ana Saloco
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Apple className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Plan Personalizado en Preparación
                </h3>
                <p className="text-muted-foreground mb-6"></p>

                <div className="bg-gray-50 p-6 rounded-lg text-left max-w-2xl mx-auto">
                  <h4 className="font-medium mb-4">
                    ¿Qué incluirá tu plan personalizado?
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Plan alimentario semanal detallado
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Recetas fáciles y nutritivas
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Lista de compras organizada
                      </li>
                    </ul>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Porciones adaptadas a tus necesidades
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Suplementación si es necesaria
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Consejos de preparación y almacenamiento
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nutrition Guidelines */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="w-5 h-5" />
                Fundamentos Nutricionales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">💧</span>
                  <span>
                    <strong>Hidratación:</strong> Consume 8-10 vasos de agua al
                    día
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">🥩</span>
                  <span>
                    <strong>Proteínas:</strong> Incluye proteínas en cada comida
                    principal
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">🥬</span>
                  <span>
                    <strong>Verduras:</strong> 5 porciones de frutas y verduras
                    diarias
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">🌾</span>
                  <span>
                    <strong>Carbohidratos:</strong> Prefiere opciones integrales
                    y complejas
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Timing de Comidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">🌅</span>
                  <span>
                    <strong>Desayuno:</strong> Dentro de 1 hora después de
                    despertar
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">⏰</span>
                  <span>
                    <strong>Frecuencia:</strong> Come cada 3-4 horas
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">💪</span>
                  <span>
                    <strong>Post-entreno:</strong> Proteínas dentro de 30 min
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">🌙</span>
                  <span>
                    <strong>Cena:</strong> 3 horas antes de dormir
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NutritionPage;
