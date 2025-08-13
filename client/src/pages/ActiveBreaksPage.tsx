import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Play, Clock, Target, Zap, Coffee, Stretch, ChevronRight } from 'lucide-react';

// Predefined exercises list
const ACTIVE_BREAKS_EXERCISES = [
  {
    title: "Estiramiento de Glúteos",
    description: "Libera la tensión en los músculos glúteos después de estar sentado",
    duration: "30-60 segundos",
    difficulty: "Fácil",
    videoUrl: "https://youtube.com/watch?v=example1",
    instructions: "Siéntate en una silla, coloca el tobillo derecho sobre la rodilla izquierda y presiona suavemente la rodilla hacia abajo."
  },
  {
    title: "Extensión de Hombros en Silla",
    description: "Alivia la tensión en hombros y cuello por posturas prolongadas",
    duration: "45 segundos",
    difficulty: "Fácil", 
    videoUrl: "https://youtube.com/watch?v=example2",
    instructions: "Siéntate derecho, entrelaza los dedos por detrás de la cabeza y abre los codos hacia atrás."
  },
  {
    title: "Estiramiento del Piriforme en Silla",
    description: "Reduce la tensión en la cadera y mejora la movilidad",
    duration: "60 segundos cada lado",
    difficulty: "Moderado",
    videoUrl: "https://youtube.com/watch?v=example3", 
    instructions: "Cruza una pierna sobre la otra y inclínate hacia adelante manteniendo la espalda recta."
  },
  {
    title: "Rotación Lateral del Tronco",
    description: "Mejora la movilidad de la columna vertebral",
    duration: "30 segundos cada lado",
    difficulty: "Fácil",
    videoUrl: "https://youtube.com/watch?v=example4",
    instructions: "Siéntate derecho y rota el tronco hacia un lado manteniendo las caderas fijas."
  },
  {
    title: "Estiramiento Posterior de Cadera",
    description: "Alivia la tensión en la parte posterior de la cadera",
    duration: "45 segundos cada lado", 
    difficulty: "Moderado",
    videoUrl: "https://youtube.com/watch?v=example5",
    instructions: "De pie, lleva una rodilla hacia el pecho y sostén con ambas manos."
  },
  {
    title: "Estiramiento de Isquiotibiales",
    description: "Estira los músculos posteriores de las piernas",
    duration: "60 segundos cada pierna",
    difficulty: "Moderado",
    videoUrl: "https://youtube.com/watch?v=example6", 
    instructions: "Extiende una pierna sobre una silla y inclínate hacia adelante desde la cadera."
  },
  {
    title: "Sentadilla Profunda con Apertura de Pecho",
    description: "Ejercicio completo que activa múltiples grupos musculares",
    duration: "60-90 segundos",
    difficulty: "Avanzado",
    videoUrl: "https://youtube.com/watch?v=example7",
    instructions: "Baja en sentadilla profunda y abre los brazos hacia los lados expandiendo el pecho."
  },
  {
    title: "Movilidad del Cuello",
    description: "Reduce la tensión cervical y mejora la flexibilidad del cuello", 
    duration: "2-3 minutos",
    difficulty: "Fácil",
    videoUrl: "https://youtube.com/watch?v=example8",
    instructions: "Realiza movimientos suaves del cuello: adelante, atrás, y rotaciones lentas."
  },
  {
    title: "Estiramiento de Psoas y Oblicuos",
    description: "Estira los flexores de cadera y músculos laterales",
    duration: "45 segundos cada lado",
    difficulty: "Moderado",
    videoUrl: "https://youtube.com/watch?v=example9", 
    instructions: "Da un paso atrás en estocada y inclínate hacia el lado opuesto."
  },
  {
    title: "Extensión de Rodilla",
    description: "Fortalece el cuádriceps y mejora la movilidad de la rodilla",
    duration: "30 segundos cada pierna",
    difficulty: "Fácil",
    videoUrl: "https://youtube.com/watch?v=example10",
    instructions: "Siéntate en una silla y extiende una pierna completamente, mantén la posición."
  },
  {
    title: "Postura de la Vela",
    description: "Estiramiento avanzado que mejora la circulación",
    duration: "60-120 segundos",
    difficulty: "Avanzado",
    videoUrl: "https://youtube.com/watch?v=example11",
    instructions: "Acuéstate boca arriba y eleva las piernas hacia el cielo, apoya la espalda baja con las manos."
  },
  {
    title: "Apertura de Pecho",
    description: "Contrarresta la postura encorvada y fortalece la espalda",
    duration: "45-60 segundos", 
    difficulty: "Fácil",
    videoUrl: "https://youtube.com/watch?v=example12",
    instructions: "Entrelaza las manos por detrás de la espalda y levanta los brazos separándolos del cuerpo."
  },
  {
    title: "Tracción de Rodillas",
    description: "Alivia la tensión en la espalda baja",
    duration: "60 segundos",
    difficulty: "Fácil",
    videoUrl: "https://youtube.com/watch?v=example13",
    instructions: "Acuéstate boca arriba y abraza ambas rodillas hacia el pecho."
  },
  {
    title: "Extensión de Hombros",
    description: "Mejora la movilidad y fuerza de los hombros",
    duration: "30-45 segundos",
    difficulty: "Fácil",
    videoUrl: "https://youtube.com/watch?v=example14",
    instructions: "Extiende los brazos hacia arriba y hacia atrás, sintiendo el estiramiento en los hombros."
  }
];

const ActiveBreaksPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<string>('all');
  const [isLoading, setIsLoading] = React.useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Fácil': return 'bg-green-100 text-green-800 border-green-200';
      case 'Moderado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Avanzado': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredExercises = selectedDifficulty === 'all' 
    ? ACTIVE_BREAKS_EXERCISES 
    : ACTIVE_BREAKS_EXERCISES.filter(ex => ex.difficulty === selectedDifficulty);

  const openVideo = (videoUrl: string, title: string) => {
    // In a real app, these would be actual YouTube URLs
    alert(`Abriendo video instructivo para: ${title}\n\nEn la versión completa, este enlace te llevaría al video de YouTube correspondiente.`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando pausas activas...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pausas Activas</h1>
        <p className="text-muted-foreground">Ejercicios rápidos para mantenerte activo y saludable durante el día</p>
      </div>

      <div className="space-y-8">
        {/* Benefits of Active Breaks */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-blue-700 flex items-center gap-2">
              <Target className="w-6 h-6" />
              ¿Por qué hacer Pausas Activas?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold mb-2 text-blue-800">Mejora la Concentración</h4>
                <p className="text-sm text-blue-700">
                  Aumenta tu productividad y claridad mental con descansos activos regulares
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Coffee className="w-6 h-6 text-indigo-600" />
                </div>
                <h4 className="font-semibold mb-2 text-indigo-800">Reduce el Estrés</h4>
                <p className="text-sm text-indigo-700">
                  Libera tensiones acumuladas y mejora tu estado de ánimo naturalmente
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Stretch className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-semibold mb-2 text-purple-800">Previene Lesiones</h4>
                <p className="text-sm text-purple-700">
                  Evita problemas posturales y molestias por estar sentado mucho tiempo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter by difficulty */}
        <Card>
          <CardHeader>
            <CardTitle>Filtrar por Dificultad</CardTitle>
            <CardDescription>Elige el nivel que mejor se adapte a tu experiencia actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedDifficulty === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedDifficulty('all')}
                size="sm"
              >
                Todos ({ACTIVE_BREAKS_EXERCISES.length})
              </Button>
              <Button
                variant={selectedDifficulty === 'Fácil' ? 'default' : 'outline'}
                onClick={() => setSelectedDifficulty('Fácil')}
                size="sm"
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                Fácil ({ACTIVE_BREAKS_EXERCISES.filter(ex => ex.difficulty === 'Fácil').length})
              </Button>
              <Button
                variant={selectedDifficulty === 'Moderado' ? 'default' : 'outline'}
                onClick={() => setSelectedDifficulty('Moderado')}
                size="sm"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
              >
                Moderado ({ACTIVE_BREAKS_EXERCISES.filter(ex => ex.difficulty === 'Moderado').length})
              </Button>
              <Button
                variant={selectedDifficulty === 'Avanzado' ? 'default' : 'outline'}
                onClick={() => setSelectedDifficulty('Avanzado')}
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                Avanzado ({ACTIVE_BREAKS_EXERCISES.filter(ex => ex.difficulty === 'Avanzado').length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Exercise Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((exercise, index) => (
            <Card 
              key={index} 
              className="hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-primary"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg leading-tight">{exercise.title}</CardTitle>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(exercise.difficulty)}`}>
                    {exercise.difficulty}
                  </span>
                </div>
                <CardDescription className="text-sm">
                  {exercise.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{exercise.duration}</span>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <h5 className="font-medium mb-1">Instrucciones:</h5>
                  <p className="text-muted-foreground">{exercise.instructions}</p>
                </div>
                
                <Button 
                  onClick={() => openVideo(exercise.videoUrl, exercise.title)}
                  className="w-full"
                  size="sm"
                >
                  <Play size={16} className="mr-2" />
                  Ver Video Instructivo
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Consejos para Pausas Activas Efectivas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-primary">🕐 Cuándo Hacerlas</h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Cada 1-2 horas de trabajo sedentario</li>
                  <li>• Al sentir tensión en cuello u hombros</li>
                  <li>• Durante cambios de actividad</li>
                  <li>• En momentos de baja energía</li>
                  <li>• Antes y después de entrenamientos</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-primary">💡 Cómo Maximizar Beneficios</h4>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Mantén una respiración profunda y controlada</li>
                  <li>• Concéntrate en los músculos que trabajas</li>
                  <li>• Realiza movimientos controlados y precisos</li>
                  <li>• Adapta ejercicios según tu espacio disponible</li>
                  <li>• Escucha a tu cuerpo y no fuerces</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Routines */}
        <Card>
          <CardHeader>
            <CardTitle>Rutinas Rápidas Sugeridas</CardTitle>
            <CardDescription>Secuencias de ejercicios para diferentes momentos del día</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 border rounded-lg bg-gradient-to-br from-orange-50 to-yellow-50">
                <h4 className="font-semibold mb-2 text-orange-800">🌅 Energizante Matutino</h4>
                <p className="text-sm text-orange-700 mb-3">3-5 minutos para activar el cuerpo</p>
                <ul className="text-xs text-orange-600 space-y-1">
                  <li>• Movilidad del cuello</li>
                  <li>• Extensión de hombros</li>
                  <li>• Apertura de pecho</li>
                  <li>• Respiraciones profundas</li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <h4 className="font-semibold mb-2 text-blue-800">💼 Pausa de Oficina</h4>
                <p className="text-sm text-blue-700 mb-3">2-3 minutos en tu escritorio</p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• Rotación lateral del tronco</li>
                  <li>• Extensión de hombros en silla</li>
                  <li>• Estiramiento de cuello</li>
                  <li>• Extensión de rodilla</li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50">
                <h4 className="font-semibold mb-2 text-green-800">🌆 Descanso Vespertino</h4>
                <p className="text-sm text-green-700 mb-3">5-7 minutos de relajación</p>
                <ul className="text-xs text-green-600 space-y-1">
                  <li>• Estiramiento de glúteos</li>
                  <li>• Tracción de rodillas</li>
                  <li>• Estiramiento de isquiotibiales</li>
                  <li>• Respiración relajante</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActiveBreaksPage;