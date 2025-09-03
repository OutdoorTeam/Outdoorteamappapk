
import * as React from 'react';
import { useEvaluations, useSaveWhoqol } from '@/hooks/api/use-evaluations';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb } from 'lucide-react';
import { parseApiError, getErrorMessage } from '@/utils/error-handling';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const whoqolQuestions = [
    { text: "¿Cómo calificaría su calidad de vida?", domain: "overall", reverse: false },
    { text: "¿Cuán satisfecho/a está con su salud?", domain: "overall", reverse: false },
    { text: "¿En qué medida siente que el dolor (físico) le impide hacer lo que necesita?", domain: "physical", reverse: true },
    { text: "¿En qué medida necesita de algún tratamiento médico para funcionar en su vida diaria?", domain: "physical", reverse: true },
    { text: "¿En qué medida disfruta de la vida?", domain: "psychological", reverse: false },
    { text: "¿En qué medida siente que su vida tiene sentido?", domain: "psychological", reverse: false },
    { text: "¿En qué medida es capaz de concentrarse?", domain: "psychological", reverse: false },
    { text: "En general, ¿cuán seguro/a se siente en su vida diaria?", domain: "environmental", reverse: false },
    { text: "¿Cuán saludable es su entorno físico (clima, ruido, polución, atractivos)?", domain: "environmental", reverse: false },
    { text: "¿Tiene suficiente energía para su vida diaria?", domain: "physical", reverse: false },
    { text: "¿Es capaz de aceptar su apariencia física?", domain: "psychological", reverse: false },
    { text: "¿Tiene suficiente dinero para cubrir sus necesidades?", domain: "environmental", reverse: false },
    { text: "¿En qué medida tiene la oportunidad de adquirir nueva información y habilidades?", domain: "environmental", reverse: false },
    { text: "¿En qué medida tiene oportunidades de ocio y recreación?", domain: "environmental", reverse: false },
    { text: "¿Cuán bien es capaz de desplazarse de un lugar a otro?", domain: "physical", reverse: false },
    { text: "¿Cuán satisfecho/a está con su sueño?", domain: "physical", reverse: false },
    { text: "¿Cuán satisfecho/a está con su capacidad para realizar las actividades de su vida diaria?", domain: "physical", reverse: false },
    { text: "¿Cuán satisfecho/a está con su capacidad para trabajar?", domain: "physical", reverse: false },
    { text: "¿Cuán satisfecho/a está consigo mismo/a?", domain: "psychological", reverse: false },
    { text: "¿Cuán satisfecho/a está con sus relaciones personales (amigos, parientes, etc.)?", domain: "social", reverse: false },
    { text: "¿Cuán satisfecho/a está con su vida sexual?", domain: "social", reverse: false },
    { text: "¿Cuán satisfecho/a está con el apoyo que recibe de sus amigos?", domain: "social", reverse: false },
    { text: "¿Cuán satisfecho/a está con las condiciones del lugar donde vive?", domain: "environmental", reverse: false },
    { text: "¿Cuán satisfecho/a está con su acceso a los servicios sanitarios?", domain: "environmental", reverse: false },
    { text: "¿Cuán satisfecho/a está con su medio de transporte?", domain: "environmental", reverse: false },
    { text: "Con qué frecuencia tiene sentimientos negativos como tristeza, desesperanza, ansiedad, depresión?", domain: "psychological", reverse: true },
];

const domainMapping: { [key: string]: number[] } = {
    physical: [3, 4, 10, 15, 16, 17, 18],
    psychological: [5, 6, 7, 11, 19, 26],
    social: [20, 21, 22],
    environmental: [8, 9, 12, 13, 14, 23, 24, 25],
};

const WhoqolEvaluation: React.FC = () => {
  const { data: history, isLoading } = useEvaluations('whoqol');
  const saveWhoqolMutation = useSaveWhoqol();
  const { toast } = useToast();
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const [notes, setNotes] = React.useState('');

  const lastEvaluation = history?.[0];
  const canEvaluate = !lastEvaluation || new Date().getTime() - new Date(lastEvaluation.created_at).getTime() > 90 * 24 * 60 * 60 * 1000;
  const nextAvailableDate = lastEvaluation ? new Date(new Date(lastEvaluation.created_at).getTime() + 90 * 24 * 60 * 60 * 1000) : null;

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers(prev => ({ ...prev, [index]: parseInt(value, 10) }));
  };

  const calculateScores = () => {
    const scores: { [key: string]: number } = { physical: 0, psychological: 0, social: 0, environmental: 0 };
    let totalScore = 0;
    let totalDomains = 0;

    for (const domain in domainMapping) {
        let domainSum = 0;
        for (const qIndex of domainMapping[domain]) {
            const question = whoqolQuestions[qIndex - 1];
            let answer = answers[qIndex - 1];
            if (answer === undefined) continue;
            if (question.reverse) {
                answer = 6 - answer;
            }
            domainSum += answer;
        }
        const domainScore = (domainSum / (domainMapping[domain].length * 5)) * 100;
        scores[domain] = Math.round(domainScore);
        totalScore += domainScore;
        totalDomains++;
    }
    scores.total = Math.round(totalScore / totalDomains);
    return scores;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(answers).length < whoqolQuestions.length) {
        toast({ title: "Error", description: "Por favor, responde todas las preguntas.", variant: "destructive" });
        return;
    }
    const scores = calculateScores();
    try {
      await saveWhoqolMutation.mutateAsync({ scores, answers_json: answers, notes });
      toast({ title: "Éxito", description: "Evaluación WHOQOL-BREF guardada correctamente." });
      setAnswers({});
      setNotes('');
    } catch (error) {
      const apiError = parseApiError(error);
      toast({ title: "Error", description: getErrorMessage(apiError), variant: "destructive" });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-green-100 text-green-800';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const chartData = history?.slice(0, 2).map(h => ({
    name: new Date(h.created_at).toLocaleDateString(),
    Físico: h.score_physical,
    Psicológico: h.score_psychological,
    Social: h.score_social,
    Ambiental: h.score_environmental,
  })).reverse();

  if (isLoading) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Cuestionario de Calidad de Vida (WHOQOL-BREF)</h3>
      
      {lastEvaluation && (
        <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Última Evaluación ({new Date(lastEvaluation.created_at).toLocaleDateString()})</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
                <div className={`p-2 rounded ${getScoreColor(lastEvaluation.score_total)}`}>
                    <div className="text-xs">Total</div>
                    <div className="font-bold">{lastEvaluation.score_total}</div>
                </div>
                <div className={`p-2 rounded ${getScoreColor(lastEvaluation.score_physical)}`}>
                    <div className="text-xs">Físico</div>
                    <div className="font-bold">{lastEvaluation.score_physical}</div>
                </div>
                <div className={`p-2 rounded ${getScoreColor(lastEvaluation.score_psychological)}`}>
                    <div className="text-xs">Psicológico</div>
                    <div className="font-bold">{lastEvaluation.score_psychological}</div>
                </div>
                <div className={`p-2 rounded ${getScoreColor(lastEvaluation.score_social)}`}>
                    <div className="text-xs">Social</div>
                    <div className="font-bold">{lastEvaluation.score_social}</div>
                </div>
                <div className={`p-2 rounded ${getScoreColor(lastEvaluation.score_environmental)}`}>
                    <div className="text-xs">Ambiental</div>
                    <div className="font-bold">{lastEvaluation.score_environmental}</div>
                </div>
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
          {whoqolQuestions.map((q, index) => (
            <div key={index} className="space-y-2 p-3 border rounded-md">
              <Label>{index + 1}. {q.text}</Label>
              <RadioGroup onValueChange={(value) => handleAnswerChange(index, value)} className="flex space-x-4">
                {[1, 2, 3, 4, 5].map(val => (
                  <div key={val} className="flex items-center space-x-2">
                    <RadioGroupItem value={String(val)} id={`q${index}-${val}`} />
                    <Label htmlFor={`q${index}-${val}`}>{val}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="whoqol-notes">Notas adicionales (opcional)</Label>
            <Textarea id="whoqol-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button type="submit" disabled={saveWhoqolMutation.isPending}>
            {saveWhoqolMutation.isPending ? 'Guardando...' : 'Guardar Evaluación'}
          </Button>
        </form>
      )}

      <div className="space-y-4">
        <h4 className="text-md font-medium">Historial de Calidad de Vida</h4>
        {chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Físico" fill="#8884d8" />
              <Bar dataKey="Psicológico" fill="#82ca9d" />
              <Bar dataKey="Social" fill="#ffc658" />
              <Bar dataKey="Ambiental" fill="#ff8042" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground">No hay suficientes datos para mostrar un historial.</p>
        )}
      </div>
    </div>
  );
};

export default WhoqolEvaluation;
