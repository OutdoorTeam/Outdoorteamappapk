
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Dumbbell, Apple, Brain, Users, CheckCircle, Award } from 'lucide-react';

const HomePage: React.FC = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: <Dumbbell className="w-8 h-8 text-primary" />,
      title: 'Entrenamiento Personalizado',
      description: 'Planes de entrenamiento adaptados a tus objetivos y nivel de condición física.',
    },
    {
      icon: <Apple className="w-8 h-8 text-primary" />,
      title: 'Nutrición Inteligente',
      description: 'Guías nutricionales para complementar tu entrenamiento y mejorar tu salud.',
    },
    {
      icon: <Brain className="w-8 h-8 text-primary" />,
      title: 'Bienestar Mental',
      description: 'Ejercicios de meditación y mindfulness para reducir el estrés y mejorar el enfoque.',
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: 'Comunidad y Soporte',
      description: 'Acceso a una comunidad de apoyo y seguimiento por profesionales.',
    },
  ];

  const testimonials = [
    {
      name: 'Ana Pérez',
      quote: 'Outdoor Team cambió mi vida. No solo mejoré mi físico, sino también mi mentalidad. ¡Totalmente recomendado!',
      plan: 'Programa Totum',
    },
    {
      name: 'Carlos Gómez',
      quote: 'El seguimiento personalizado es increíble. Los entrenadores realmente se preocupan por tu progreso.',
      plan: 'Entrenamiento Personalizado',
    },
    {
      name: 'Laura Fernández',
      quote: 'Nunca pensé que disfrutaría tanto del ejercicio. Los planes son variados y divertidos.',
      plan: 'Plan Básico',
    },
  ];

  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="py-20 md:py-32 text-center">
        <div className="container mx-auto px-4">
          <Award className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Transforma tu Vida, Hábito por Hábito
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Únete a nuestra academia de hábitos saludables y alcanza tu máximo potencial con programas de entrenamiento, nutrición y bienestar integral.
          </p>
          <div className="flex justify-center gap-4">
            {user ? (
              <Link to="/dashboard">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Ir a Mi Panel
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Comienza Tu Viaje
                  </Button>
                </Link>
                <Link to="/plans">
                  <Button size="lg" variant="outline">
                    Ver Planes
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">¿Qué Ofrecemos?</h2>
            <p className="text-muted-foreground mt-2">
              Un enfoque integral para tu bienestar
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">¿Cómo Funciona?</h2>
            <p className="text-muted-foreground mt-2">
              Tres simples pasos para comenzar tu transformación
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="text-5xl font-bold text-primary mb-4">1</div>
              <h3 className="text-xl font-semibold mb-2">Elige tu Plan</h3>
              <p className="text-muted-foreground">
                Selecciona el plan que mejor se adapte a tus necesidades y objetivos.
              </p>
            </div>
            <div className="p-6">
              <div className="text-5xl font-bold text-primary mb-4">2</div>
              <h3 className="text-xl font-semibold mb-2">Sigue tu Programa</h3>
              <p className="text-muted-foreground">
                Accede a tus rutinas, guías y herramientas desde nuestra plataforma.
              </p>
            </div>
            <div className="p-6">
              <div className="text-5xl font-bold text-primary mb-4">3</div>
              <h3 className="text-xl font-semibold mb-2">Alcanza tus Metas</h3>
              <p className="text-muted-foreground">
                Con nuestro apoyo y tu compromiso, lograrás resultados sorprendentes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Lo que dicen nuestros miembros</h2>
            <p className="text-muted-foreground mt-2">
              Historias reales de transformación y éxito
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground mb-4">"{testimonial.quote}"</p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.plan}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="bg-primary text-primary-foreground p-8 md:p-12">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">¿Listo para empezar?</h2>
              <p className="max-w-2xl mx-auto mb-8">
                No esperes más para invertir en tu salud. Únete a Outdoor Team hoy y da el primer paso hacia una vida más activa, saludable y feliz.
              </p>
              <Link to={user ? "/dashboard" : "/register"}>
                <Button size="lg" variant="secondary">
                  {user ? 'Ir a Mi Panel' : 'Únete Ahora'}
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
