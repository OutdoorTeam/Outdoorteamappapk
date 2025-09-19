import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Play, Filter, Clock, Target, Dumbbell, Heart, Zap } from 'lucide-react';
import { useContentLibrary } from '@/hooks/api/use-content-library';
import type { ContentLibraryItem } from '@/hooks/api/use-content-library';
import { getYouTubeThumbnail } from '@/utils/youtube';

const ExercisesPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  
  const { data: exercises = [], isLoading, error } = useContentLibrary('exercise');

  const getCategoryLabel = React.useCallback((subcategory: string | null) => {
    if (subcategory && subcategory.trim().length > 0) {
      return subcategory.trim();
    }
    return 'General';
  }, []);

  const filteredExercises = React.useMemo(() => {
    if (selectedCategory === 'all') {
      return exercises;
    }
    return exercises.filter((ex) => getCategoryLabel(ex.subcategory ?? null) === selectedCategory);
  }, [exercises, selectedCategory, getCategoryLabel]);

  const uniqueCategories = React.useMemo(() => {
    const categorySet = new Set<string>();
    exercises.forEach((ex) => {
      categorySet.add(getCategoryLabel(ex.subcategory ?? null));
    });
    return Array.from(categorySet).sort();
  }, [exercises, getCategoryLabel]);

  const groupedEntries = React.useMemo(() => {
    const groups = new Map<string, ContentLibraryItem[]>();
    exercises.forEach((ex) => {
      const label = getCategoryLabel(ex.subcategory ?? null);
      const current = groups.get(label);
      if (current) {
        current.push(ex);
      } else {
        groups.set(label, [ex]);
      }
    });
    return Array.from(groups.entries());
  }, [exercises, getCategoryLabel]);

  const getCategoryIcon = (category: string) => {
    const lowerCategory = category?.toLowerCase() || '';
    
    if (lowerCategory.includes('warm') || lowerCategory.includes('calentamiento')) {
      return <Zap className="w-5 h-5 text-orange-500" />;
    }
    if (lowerCategory.includes('strength') || lowerCategory.includes('fuerza')) {
      return <Dumbbell className="w-5 h-5 text-red-500" />;
    }
    if (lowerCategory.includes('flex') || lowerCategory.includes('stretch')) {
      return <Heart className="w-5 h-5 text-purple-500" />;
    }
    if (lowerCategory.includes('cardio')) {
      return <Target className="w-5 h-5 text-blue-500" />;
    }
    return <Play className="w-5 h-5 text-gray-500" />;
  };

  const openVideo = (videoUrl: string | null, title: string) => {
    if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) {
      window.open(videoUrl, '_blank');
    } else {
      alert(`Video: ${title}\n\nEn la versión completa, esto abriría el video instructivo.`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando ejercicios...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Error al cargar ejercicios</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Biblioteca de Ejercicios</h1>
        <p className="text-muted-foreground">Videos instructivos organizados por categorías para optimizar tu entrenamiento</p>
      </div>

      <div className="space-y-8">
        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros de Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label>Categoría</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las Categorías</SelectItem>
                    {uniqueCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedCategory('all')}
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exercises by Category */}
        {groupedEntries.length > 0 ? (
          groupedEntries.map(([category, categoryExercises]) => (
            <Card key={category} className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getCategoryIcon(category)}
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                  <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {categoryExercises.length} ejercicios
                  </span>
                </CardTitle>
                <CardDescription>
                  Videos instructivos para {category.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryExercises.map((exercise) => {
                    const thumbnail = getYouTubeThumbnail(exercise.video_url);
                    
                    return (
                      <Card key={exercise.id} className="hover:shadow-lg transition-all hover:scale-105 group overflow-hidden">
                        {/* Video Thumbnail */}
                        {thumbnail ? (
                          <div className="relative aspect-video">
                            <img
                              src={thumbnail}
                              alt={exercise.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to default thumbnail if maxres fails
                                const target = e.target as HTMLImageElement;
                                if (target.src.includes('maxresdefault')) {
                                  target.src = target.src.replace('maxresdefault', 'mqdefault');
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-12 h-12 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-video bg-gray-200 flex items-center justify-center">
                            <div className="text-center text-gray-500">
                              <Play className="w-8 h-8 mx-auto mb-2" />
                              <p className="text-sm">Video</p>
                            </div>
                          </div>
                        )}

                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg leading-tight pr-2">{exercise.title}</CardTitle>
                          </div>
                          {exercise.description && (
                            <CardDescription className="text-sm">
                              {exercise.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {exercise.duration_minutes && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span>{`${exercise.duration_minutes} min`}</span>
                            </div>
                          )}
                          
                          <Button 
                            onClick={() => openVideo(exercise.video_url, exercise.title)}
                            className="w-full group-hover:bg-red-600 group-hover:text-white transition-colors bg-red-50 text-red-600 border border-red-200 hover:bg-red-600"
                            size="sm"
                          >
                            <Play size={16} className="mr-2" />
                            Ver Video en YouTube
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          // Empty state when no exercises
          <Card>
            <CardContent className="text-center py-12">
              <Dumbbell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No hay ejercicios disponibles</h3>
              <p className="text-muted-foreground mb-6">
                Los videos de ejercicios se agregarán pronto desde el panel administrativo.
              </p>
              {selectedCategory !== 'all' && (
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedCategory('all')}
                >
                  Ver Todos los Ejercicios
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Exercise Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Consejos para Ejercitarse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-primary">🎯 Antes de Ejercitarte</h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Realiza un calentamiento adecuado de 5-10 minutos</li>
                  <li>• Asegúrate de tener suficiente espacio libre</li>
                  <li>• Usa ropa cómoda y calzado apropiado</li>
                  <li>• Mantente hidratado antes, durante y después</li>
                  <li>• Sigue las instrucciones de los videos cuidadosamente</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-primary">💡 Maximizar Resultados</h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Mantén una técnica correcta sobre la velocidad</li>
                  <li>• Respira de manera controlada durante cada ejercicio</li>
                  <li>• Progresa gradualmente en intensidad y duración</li>
                  <li>• Escucha a tu cuerpo y descansa cuando sea necesario</li>
                  <li>• Registra tu progreso para mantenerte motivado</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Ejercicios</CardTitle>
            <CardDescription>Entiende los diferentes tipos de entrenamiento disponibles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 border rounded-lg">
                <Zap className="w-8 h-8 text-orange-500 mx-auto mb-3" />
                <h4 className="font-semibold mb-2 text-orange-600">Calentamiento</h4>
                <p className="text-sm text-muted-foreground">
                  Prepara tu cuerpo para el ejercicio principal
                </p>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <Dumbbell className="w-8 h-8 text-red-500 mx-auto mb-3" />
                <h4 className="font-semibold mb-2 text-red-600">Fuerza</h4>
                <p className="text-sm text-muted-foreground">
                  Desarrolla masa muscular y potencia
                </p>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <Target className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                <h4 className="font-semibold mb-2 text-blue-600">Cardio</h4>
                <p className="text-sm text-muted-foreground">
                  Mejora la resistencia cardiovascular
                </p>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <Heart className="w-8 h-8 text-purple-500 mx-auto mb-3" />
                <h4 className="font-semibold mb-2 text-purple-600">Flexibilidad</h4>
                <p className="text-sm text-muted-foreground">
                  Aumenta el rango de movimiento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExercisesPage;
