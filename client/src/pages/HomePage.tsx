import * as React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const HomePage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Outdoor Team – Academia de Hábitos Saludables
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Transforma tu estilo de vida con planes de entrenamiento
          personalizados, orientación nutricional y seguimiento de hábitos.
          Únete a nuestra comunidad y construye hábitos saludables duraderos.
        </p>
        <Link to="/register">
          <Button size="lg" className="text-lg px-8 py-3">
            Comienza Tu Viaje Hoy
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mt-16">
        <Card>
          <CardHeader>
            <CardTitle>Entrenamiento Personalizado</CardTitle>
            <CardDescription>
              Obtén planes de entrenamiento personalizados diseñados para tu
              nivel de condición física y objetivos
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orientación Nutricional</CardTitle>
            <CardDescription>
              Planes de nutrición profesionales por la nutricionista licenciada
              Ana Saloco
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seguimiento de Hábitos</CardTitle>
            <CardDescription>
              Construye hábitos saludables duraderos con nuestro sistema
              integral de seguimiento
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="text-center mt-16">
        <Link to="/planes">
          <Button variant="outline" size="lg">
            Ver Nuestros Planes
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
