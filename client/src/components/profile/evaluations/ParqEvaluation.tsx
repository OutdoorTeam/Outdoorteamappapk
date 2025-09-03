
import * as React from 'react';
import { useEvaluations, useSaveParq } from '@/hooks/api/use-evaluations';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, ShieldAlert } from 'lucide-react';
import { parseApiError, getErrorMessage } from '@/utils/error-handling';

const parqQuestions = [
  "¿Alguna vez un médico le ha dicho que usted tiene un problema cardíaco y que solo debe realizar actividad física recomendada por un médico?",
  "¿Siente dolor en el pecho cuando realiza actividad física?",
  "En el último mes, ¿ha tenido dolor en el pecho cuando no estaba realizando actividad física?",
  "¿Pierde el equilibrio debido a mareos o alguna vez ha perdido el conocimiento?",
  "¿Tiene algún problema óseo o articular (por ejemplo, en la espalda, rodilla o cadera) que podría empeorar al aumentar su actividad física?",
  "¿Actualmente un médico le receta medicamentos para la presión arterial o para un problema cardíaco?",
  "¿Conoce alguna otra razón por la que no debería realizar actividad física?",
];

const ParqEvaluation: React.FC = () => {
  const { data: history, isLoading } = useEvaluations('parq');
  const saveParqMutation = useSaveParq();
  const { toast } = useToast();
  const [answers, setAnswers] = React.useState<Record<number, boolean>>({});
  const [notes, setNotes] = React.useState('');

  const lastEvaluation = history?.[0];
  const canEvaluate = !lastEvaluation || new Date().getTime() - new Date(lastEvaluation.created_at).getTime() > 90 * 24 * 60 * 60 * 1000;
  const nextAvailableDate = lastEvaluation ? new Date(new Date(lastEvaluation.created_at).getTime() + 90 * 24 * 60 * 60 * 1000) : null;

  const handleCheckboxChange = (index: number, checked: boolean) => {
    setAnswers(prev => ({ ...prev, [index]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result_flag = Object.values(answers).some(answer => answer === true);

    try {
      await saveParqMutation.mutateAsync({
        answers_json: answers,
        result_flag,
        notes,
      } as any);
      toast({ title: "Éxito", description: "Evaluación PAR-Q guardada correctamente." });
      setAnswers({});
      setNotes('');
    } catch (error) {
      const apiError = parseApiError(error);
      toast({ title: "Error", description: getErrorMessage(apiError), variant: "destructive" });
    }
  };

  if (isLoading) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Cuestionario de Aptitud para la Actividad Física (PAR-Q)</h3>
      
      {lastEvaluation?.result_flag && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>PAR-Q Positivo</AlertTitle>
          <AlertDescription>
            Tu última evaluación indica que debes tener precaución. Recomendamos consulta médica antes de iniciar o progresar la carga de entrenamiento.
          </AlertDescription>
        </Alert>
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
          {parqQuestions.map((question, index) => (
            <div key={index} className="flex items-start space-x-2">
              <Checkbox
                id={`parq-${index}`}
                checked={answers[index] || false}
                onCheckedChange={(checked) => handleCheckboxChange(index, !!checked)}
              />
              <Label htmlFor={`parq-${index}`} className="font-normal">{question}</Label>
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="parq-notes">Notas adicionales (opcional)</Label>
            <Textarea
              id="parq-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade cualquier nota relevante aquí..."
            />
          </div>
          <Button type="submit" disabled={saveParqMutation.isPending}>
            {saveParqMutation.isPending ? 'Guardando...' : 'Guardar Evaluación'}
          </Button>
        </form>
      )}

      <div className="space-y-4">
        <h4 className="text-md font-medium">Historial de Evaluaciones PAR-Q</h4>
        {history && history.length > 0 ? (
          <ul className="space-y-2">
            {history.map(item => (
              <li key={item.id} className="flex justify-between items-center p-2 border rounded-md">
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                <span className={`px-2 py-1 text-xs rounded-full ${item.result_flag ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  {item.result_flag ? 'Positivo' : 'Negativo'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No hay evaluaciones anteriores.</p>
        )}
      </div>
    </div>
  );
};

export default ParqEvaluation;
