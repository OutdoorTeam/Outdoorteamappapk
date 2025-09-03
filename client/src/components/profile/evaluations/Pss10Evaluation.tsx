
import * as React from 'react';
import { useEvaluations, useSavePss10 } from '@/hooks/api/use-evaluations';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, ShieldAlert } from 'lucide-react';
import { parseApiError, getErrorMessage } from '@/utils/error-handling';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const pss10Questions = [
  "En el último mes, ¿con qué frecuencia ha estado afectado por algo que ha ocurrido inesperadamente?",
  "En el último mes, ¿con qué frecuencia se ha sentido incapaz de controlar las cosas importantes en su vida?",
  "En el último mes, ¿con qué frecuencia se ha sentido nervioso o estresado?",
  "En el último mes, ¿con qué frecuencia ha estado seguro sobre su capacidad para manejar sus problemas personales?",
  "En el último mes, ¿con qué frecuencia ha sentido que las cosas le van bien?",
  "En el último mes, ¿con qué frecuencia ha sentido que no podía afrontar todas las cosas que tenía que hacer?",
  "En el último mes, ¿con qué frecuencia ha sido capaz de controlar las irritaciones en su vida?",
  "En el último mes, ¿con qué frecuencia se ha sentido que estaba al tanto de las cosas?",
  "En el último mes, ¿con qué frecuencia se ha enfadado por las cosas que estaban fuera de su control?",
  "En el último mes, ¿con qué frecuencia ha sentido que las dificultades se acumulaban tanto que no podía superarlas?",
];

const Pss10Evaluation: React.FC = () => {
  const { data: history, isLoading } = useEvaluations('pss10');
  const savePss10Mutation = useSavePss10();
  const { toast } = useToast();
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const [notes, setNotes] = React.useState('');

  const lastEvaluation = history?.[0];
  const canEvaluate = !lastEvaluation || new Date().getTime() - new Date(lastEvaluation.created_at).getTime() > 30 * 24 * 60 * 60 * 1000;
  const nextAvailableDate = lastEvaluation ? new Date(new Date(lastEvaluation.created_at).getTime() + 30 * 24 * 60 * 60 * 1000) : null;

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers(prev => ({ ...prev, [index]: parseInt(value, 10) }));
  };

  const calculateScore = () => {
    let score = 0;
    const positiveItems = [3, 4, 6, 7]; // Indices base 0
    for (let i = 0; i < 10; i++) {
      if (answers[i] === undefined) continue;
      if (positiveItems.includes(i)) {
        score += (4 - answers[i]);
      } else {
        score += answers[i];
      }
    }
    return score;
  };

  const getCategory = (score: number) => {
    if (score <= 13) return 'bajo';
    if (score <= 26) return 'moderado';
    return 'alto';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(answers).length < pss10Questions.length) {
        toast({ title: "Error", description: "Por favor, responde todas las preguntas.", variant: "destructive" });
        return;
    }
    const score_total = calculateScore();
    const category = getCategory(score_total);
    try {
      await savePss10Mutation.mutateAsync({ score_total, category, answers_json: answers, notes } as any);
      toast({ title: "Éxito", description: "Evaluación PSS-10 guardada correctamente." });
      setAnswers({});
      setNotes('');
    } catch (error) {
      const apiError = parseApiError(error);
      toast({ title: "Error", description: getErrorMessage(apiError), variant: "destructive" });
    }
  };

  const getCategoryColor = (category: string) => {
    if (category === 'bajo') return 'bg-green-100 text-green-800';
    if (category === 'moderado') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const chartData = history?.slice(0, 6).map(h => ({
    name: new Date(h.created_at).toLocaleDateString(),
    Puntuación: h.score_total,
  })).reverse();

  if (isLoading) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Escala de Estrés Percibido (PSS-10)</h3>
      
      {lastEvaluation?.category === 'alto' && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Nivel de Estrés Alto</AlertTitle>
          <AlertDescription>
            Tu última evaluación indica un nivel de estrés alto. Sugerimos priorizar la sección de respiración/meditación y ajustar la carga de entrenamiento.
          </AlertDescription>
        </Alert>
      )}

      {lastEvaluation && (
        <div className="p-4 border rounded-lg flex justify-between items-center">
            <h4 className="font-medium">Última Evaluación ({new Date(lastEvaluation.created_at).toLocaleDateString()})</h4>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(lastEvaluation.category)}`}>
                Puntuación: {lastEvaluation.score_total} (Nivel {lastEvaluation.category})
            </div>
        </div>
      )}

      {!canEvaluate && nextAvailableDate && (
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>Próxima Evaluación</AlertTitle>
          <AlertDescription>
            Podrás volver a completar este cuestionario a partir del {nextAvailableDate.toLocaleDateString()}.
          </AlertDescription>
        </Alert>
      )}

      {canEvaluate && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {pss10Questions.map((q, index) => (
            <div key={index} className="space-y-2 p-3 border rounded-md">
              <Label>{index + 1}. {q}</Label>
              <RadioGroup onValueChange={(value) => handleAnswerChange(index, value)} className="flex space-x-4">
                {[
                  { value: 0, label: 'Nunca' },
                  { value: 1, label: 'Casi nunca' },
                  { value: 2, label: 'De vez en cuando' },
                  { value: 3, label: 'A menudo' },
                  { value: 4, label: 'Muy a menudo' },
                ].map(opt => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={String(opt.value)} id={`pss-q${index}-${opt.value}`} />
                    <Label htmlFor={`pss-q${index}-${opt.value}`}>{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="pss10-notes">Notas adicionales (opcional)</Label>
            <Textarea id="pss10-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button type="submit" disabled={savePss10Mutation.isPending}>
            {savePss10Mutation.isPending ? 'Guardando...' : 'Guardar Evaluación'}
          </Button>
        </form>
      )}

      <div className="space-y-4">
        <h4 className="text-md font-medium">Historial de Estrés Percibido</h4>
        {chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 40]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Puntuación" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground">No hay suficientes datos para mostrar un historial.</p>
        )}
      </div>
    </div>
  );
};

export default Pss10Evaluation;
