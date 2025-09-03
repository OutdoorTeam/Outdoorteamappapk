
import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, HeartPulse, BrainCircuit } from 'lucide-react';
import ParqEvaluation from './evaluations/ParqEvaluation';
import WhoqolEvaluation from './evaluations/WhoqolEvaluation';
import Pss10Evaluation from './evaluations/Pss10Evaluation';

const EvaluationsTab: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluaciones de Salud</CardTitle>
        <CardDescription>
          Completa y revisa tus evaluaciones de salud para un seguimiento personalizado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="parq" className="space-y-4">
          <TabsList>
            <TabsTrigger value="parq" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              PAR-Q
            </TabsTrigger>
            <TabsTrigger value="whoqol" className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4" />
              WHOQOL-BREF
            </TabsTrigger>
            <TabsTrigger value="pss10" className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4" />
              PSS-10
            </TabsTrigger>
          </TabsList>
          <TabsContent value="parq">
            <ParqEvaluation />
          </TabsContent>
          <TabsContent value="whoqol">
            <WhoqolEvaluation />
          </TabsContent>
          <TabsContent value="pss10">
            <Pss10Evaluation />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EvaluationsTab;
