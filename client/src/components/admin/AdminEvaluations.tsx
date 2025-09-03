
import * as React from 'react';
import { useUsers } from '@/hooks/api/use-users';
import { useUserEvaluations } from '@/hooks/api/use-evaluations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const AdminEvaluations: React.FC = () => {
  const { data: users, isLoading: usersLoading } = useUsers();
  const [selectedUserId, setSelectedUserId] = React.useState<string>('');
  const [evaluationType, setEvaluationType] = React.useState<'parq' | 'whoqol' | 'pss10'>('parq');

  const { data: evaluations, isLoading: evaluationsLoading } = useUserEvaluations(
    parseInt(selectedUserId),
    evaluationType
  );

  const handleExport = () => {
    if (!evaluations || evaluations.length === 0) return;
    
    const headers = {
        parq: ['fecha', 'resultado'],
        whoqol: ['fecha', 'fisico', 'psicologico', 'social', 'ambiental', 'total'],
        pss10: ['fecha', 'puntuacion', 'categoria']
    };

    let csvContent = "data:text/csv;charset=utf-8," + headers[evaluationType].join(",") + "\n";

    const rows = evaluations.map(e => {
        const date = new Date(e.created_at).toLocaleDateString();
        if (evaluationType === 'parq' && 'result_flag' in e) {
            return [date, e.result_flag ? 'Positivo' : 'Negativo'].join(",");
        }
        if (evaluationType === 'whoqol' && 'score_total' in e) {
            return [date, e.score_physical, e.score_psychological, e.score_social, e.score_environmental, e.score_total].join(",");
        }
        if (evaluationType === 'pss10' && 'score_total' in e) {
            return [date, e.score_total, e.category].join(",");
        }
        return '';
    }).join("\n");

    csvContent += rows;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const userName = users?.find(u => u.id === parseInt(selectedUserId))?.full_name.replace(' ', '_');
    link.setAttribute("download", `evaluaciones_${userName}_${evaluationType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select onValueChange={setSelectedUserId} value={selectedUserId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Seleccionar usuario..." />
          </SelectTrigger>
          <SelectContent>
            {usersLoading ? (
              <SelectItem value="loading" disabled>Cargando...</SelectItem>
            ) : (
              users?.map(user => (
                <SelectItem key={user.id} value={String(user.id)}>{user.full_name}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => setEvaluationType(v as any)} value={evaluationType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo de evaluación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="parq">PAR-Q</SelectItem>
            <SelectItem value="whoqol">WHOQOL-BREF</SelectItem>
            <SelectItem value="pss10">PSS-10</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleExport} disabled={!evaluations || evaluations.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
        </Button>
      </div>

      {evaluationsLoading && <p>Cargando evaluaciones...</p>}
      
      {selectedUserId && !evaluationsLoading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              {evaluationType === 'parq' && <TableHead>Resultado</TableHead>}
              {evaluationType === 'whoqol' && <>
                <TableHead>Total</TableHead>
                <TableHead>Físico</TableHead>
                <TableHead>Psicológico</TableHead>
                <TableHead>Social</TableHead>
                <TableHead>Ambiental</TableHead>
              </>}
              {evaluationType === 'pss10' && <>
                <TableHead>Puntuación</TableHead>
                <TableHead>Categoría</TableHead>
              </>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {evaluations && evaluations.length > 0 ? (
              evaluations.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.created_at).toLocaleString()}</TableCell>
                  {evaluationType === 'parq' && 'result_flag' in e && (
                    <TableCell>
                      <Badge variant={e.result_flag ? 'destructive' : 'default'}>
                        {e.result_flag ? 'Positivo' : 'Negativo'}
                      </Badge>
                    </TableCell>
                  )}
                  {evaluationType === 'whoqol' && 'score_total' in e && (
                    <>
                      <TableCell>{e.score_total}</TableCell>
                      <TableCell>{e.score_physical}</TableCell>
                      <TableCell>{e.score_psychological}</TableCell>
                      <TableCell>{e.score_social}</TableCell>
                      <TableCell>{e.score_environmental}</TableCell>
                    </>
                  )}
                  {evaluationType === 'pss10' && 'score_total' in e && (
                    <>
                      <TableCell>{e.score_total}</TableCell>
                      <TableCell>
                        <Badge variant={e.category === 'alto' ? 'destructive' : e.category === 'moderado' ? 'secondary' : 'default'}>
                          {e.category}
                        </Badge>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center">No hay evaluaciones para este usuario.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default AdminEvaluations;
