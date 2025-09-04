import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useContentLibrary } from '@/hooks/api/use-content-library';
import { ArrowLeft, Save, Trash2, Play } from 'lucide-react';

interface Exercise {
  id?: number;
  sort_order: number;
  exercise_name: string;
  content_library_id: number | null;
  youtube_url: string | null;
  sets: number | null;
  reps: string | null;
  intensity: string | null;
  rest_seconds: number | null;
  tempo: string | null;
  notes: string | null;
}

interface ExerciseEditorProps {
  exercise: Exercise;
  onSave: (exercise: Exercise) => void;
  onDelete: () => void;
  onBack: () => void;
}

const ExerciseEditor: React.FC<ExerciseEditorProps> = ({ exercise, onSave, onDelete, onBack }) => {
  const { toast } = useToast();
  const [editedExercise, setEditedExercise] = React.useState<Exercise>(exercise);
  
  const { data: contentLibrary } = useContentLibrary('exercise');
  const intensityOptions = ['baja', 'media', 'alta', 'RPE6', 'RPE7', 'RPE8', 'RPE9', 'RPE10'];

  const handleChange = (field: keyof Exercise, value: any) => {
    setEditedExercise(prev => ({ ...prev, [field]: value }));
  };

  const handleContentLibrarySelect = (contentId: string) => {
    if (contentId === 'custom') {
      handleChange('content_library_id', null);
      handleChange('youtube_url', null);
    } else {
      const contentItem = contentLibrary?.find(item => item.id === parseInt(contentId));
      if (contentItem) {
        handleChange('content_library_id', contentItem.id);
        handleChange('exercise_name', contentItem.title);
        handleChange('youtube_url', contentItem.video_url);
      }
    }
  };

  const handleSave = () => {
    if (!editedExercise.exercise_name.trim()) {
      toast({ title: "Error", description: "El nombre del ejercicio es requerido", variant: "destructive" });
      return;
    }
    onSave(editedExercise);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            Editor de Ejercicio
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Exercise Selection */}
          <div className="space-y-2">
            <Label>Ejercicio de la Biblioteca</Label>
            <Select
              value={editedExercise.content_library_id?.toString() || 'custom'}
              onValueChange={handleContentLibrarySelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar ejercicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Ejercicio personalizado</SelectItem>
                {contentLibrary?.map(item => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Exercise Name */}
          <div className="space-y-2">
            <Label>Nombre del Ejercicio</Label>
            <Input
              value={editedExercise.exercise_name}
              onChange={(e) => handleChange('exercise_name', e.target.value)}
              placeholder="Nombre del ejercicio"
            />
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <Label>URL del Video</Label>
            <div className="flex gap-2">
              <Input
                value={editedExercise.youtube_url || ''}
                onChange={(e) => handleChange('youtube_url', e.target.value)}
                placeholder="https://youtube.com/..."
              />
              {editedExercise.youtube_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(editedExercise.youtube_url!, '_blank')}
                >
                  <Play className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Sets, Reps, Rest */}
          <div className="space-y-2">
            <Label>Series</Label>
            <Input
              type="number"
              value={editedExercise.sets || ''}
              onChange={(e) => handleChange('sets', parseInt(e.target.value) || null)}
              placeholder="3"
            />
          </div>
          <div className="space-y-2">
            <Label>Repeticiones</Label>
            <Input
              value={editedExercise.reps || ''}
              onChange={(e) => handleChange('reps', e.target.value)}
              placeholder="10-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Descanso (seg)</Label>
            <Input
              type="number"
              value={editedExercise.rest_seconds || ''}
              onChange={(e) => handleChange('rest_seconds', parseInt(e.target.value) || null)}
              placeholder="60"
            />
          </div>

          {/* Intensity, Tempo, Notes */}
          <div className="space-y-2">
            <Label>Intensidad</Label>
            <Select
              value={editedExercise.intensity || ''}
              onValueChange={(value) => handleChange('intensity', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar intensidad" />
              </SelectTrigger>
              <SelectContent>
                {intensityOptions.map(intensity => (
                  <SelectItem key={intensity} value={intensity}>
                    {intensity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tempo</Label>
            <Input
              value={editedExercise.tempo || ''}
              onChange={(e) => handleChange('tempo', e.target.value)}
              placeholder="Ej: 2-0-1-0"
            />
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={editedExercise.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Notas adicionales..."
              rows={2}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExerciseEditor;
