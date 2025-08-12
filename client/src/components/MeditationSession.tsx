import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Play, Pause, Square } from 'lucide-react';

interface MeditationSessionProps {
  onComplete: (duration: number, type: string, comment: string) => void;
}

type MeditationPhase = 'inhale' | 'hold' | 'exhale' | 'pause';

const MeditationSession: React.FC<MeditationSessionProps> = ({ onComplete }) => {
  const [sessionType, setSessionType] = React.useState<'guided' | 'free' | null>(null);
  const [duration, setDuration] = React.useState(5);
  const [inhaleTime, setInhaleTime] = React.useState(4);
  const [holdTime, setHoldTime] = React.useState(4);
  const [exhaleTime, setExhaleTime] = React.useState(4);
  const [enable435Hz, setEnable435Hz] = React.useState(false);
  const [enableBowl, setEnableBowl] = React.useState(false);
  
  const [isActive, setIsActive] = React.useState(false);
  const [currentPhase, setCurrentPhase] = React.useState<MeditationPhase>('inhale');
  const [phaseTime, setPhaseTime] = React.useState(0);
  const [totalTime, setTotalTime] = React.useState(0);
  const [sphereScale, setSphereScale] = React.useState(0.5);
  
  const [audioContext, setAudioContext] = React.useState<AudioContext | null>(null);
  const [hzOscillator, setHzOscillator] = React.useState<OscillatorNode | null>(null);
  
  const [showCommentDialog, setShowCommentDialog] = React.useState(false);
  const [sessionComment, setSessionComment] = React.useState('');

  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const phaseIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const guidedPresets = {
    '4-4-4': { inhale: 4, hold: 4, exhale: 4 },
    '4-7-8': { inhale: 4, hold: 7, exhale: 8 },
    '6-6-6': { inhale: 6, hold: 6, exhale: 6 }
  };

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
      if (hzOscillator) {
        hzOscillator.stop();
        hzOscillator.disconnect();
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [hzOscillator, audioContext]);

  const initializeAudio = async () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(context);

      if (enable435Hz) {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.frequency.setValueAtTime(435, context.currentTime);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.1, context.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.start();
        setHzOscillator(oscillator);
      }
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  };

  const playBowlSound = () => {
    if (!enableBowl || !audioContext) return;
    
    // Create a simple bell-like sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 2);
  };

  const startSession = async () => {
    await initializeAudio();
    setIsActive(true);
    setCurrentPhase('inhale');
    setPhaseTime(0);
    setTotalTime(0);
    
    // Start main timer
    intervalRef.current = setInterval(() => {
      setTotalTime(prev => {
        const newTime = prev + 1;
        if (newTime >= duration * 60) {
          stopSession();
        }
        return newTime;
      });
    }, 1000);

    // Start phase timer
    startPhaseTimer();
  };

  const startPhaseTimer = () => {
    const currentTimes = {
      inhale: sessionType === 'guided' ? 4 : inhaleTime,
      hold: sessionType === 'guided' ? 4 : holdTime,
      exhale: sessionType === 'guided' ? 4 : exhaleTime,
      pause: 1
    };

    phaseIntervalRef.current = setInterval(() => {
      setPhaseTime(prev => {
        const newTime = prev + 0.1;
        const phaseTarget = currentTimes[currentPhase];
        
        // Update sphere animation
        if (currentPhase === 'inhale') {
          setSphereScale(0.5 + (newTime / phaseTarget) * 0.5);
        } else if (currentPhase === 'exhale') {
          setSphereScale(1 - (newTime / phaseTarget) * 0.5);
        }
        
        if (newTime >= phaseTarget) {
          // Move to next phase
          const phases: MeditationPhase[] = ['inhale', 'hold', 'exhale', 'pause'];
          const currentIndex = phases.indexOf(currentPhase);
          const nextPhase = phases[(currentIndex + 1) % phases.length];
          
          if (nextPhase === 'inhale') {
            playBowlSound();
          }
          
          setCurrentPhase(nextPhase);
          return 0;
        }
        
        return newTime;
      });
    }, 100);
  };

  const stopSession = () => {
    setIsActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
    if (hzOscillator) {
      hzOscillator.stop();
      hzOscillator.disconnect();
      setHzOscillator(null);
    }
    setShowCommentDialog(true);
  };

  const completeSession = () => {
    const actualDuration = Math.floor(totalTime / 60);
    onComplete(actualDuration, sessionType || 'free', sessionComment);
    setShowCommentDialog(false);
    setSessionType(null);
    setSessionComment('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseText = () => {
    switch (currentPhase) {
      case 'inhale': return 'Inhala';
      case 'hold': return 'Mantén';
      case 'exhale': return 'Exhala';
      case 'pause': return 'Pausa';
      default: return '';
    }
  };

  if (showCommentDialog) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-brand-gold">Sesión Completada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-white">¡Excelente! Has completado {Math.floor(totalTime / 60)} minutos de meditación.</p>
          
          <div className="space-y-2">
            <Label className="text-white">¿Cómo fue tu experiencia? (opcional)</Label>
            <Textarea
              value={sessionComment}
              onChange={(e) => setSessionComment(e.target.value)}
              placeholder="Comparte tus pensamientos sobre esta sesión..."
              className="bg-gray-800 border-gray-600 text-white"
              rows={3}
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={completeSession} className="bg-brand-gold text-black flex-1">
              Finalizar
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCommentDialog(false);
                setSessionType(null);
              }}
              className="border-brand-gold text-brand-gold"
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isActive) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className="text-2xl font-bold text-brand-gold">
              {formatTime(totalTime)}
            </div>
            
            {/* Breathing Sphere */}
            <div className="flex justify-center">
              <div 
                className="w-32 h-32 rounded-full bg-gradient-to-br from-brand-gold to-blue-400 transition-all duration-300"
                style={{ 
                  transform: `scale(${sphereScale})`,
                  boxShadow: `0 0 ${sphereScale * 50}px rgba(211, 184, 105, 0.5)`
                }}
              />
            </div>
            
            <div className="text-xl text-white">
              {getPhaseText()}
            </div>
            
            <div className="text-sm text-gray-400">
              {currentPhase} • {Math.ceil(phaseTime)}s
            </div>
            
            <Button onClick={stopSession} variant="outline" className="border-red-500 text-red-500">
              <Square size={16} className="mr-2" />
              Terminar Sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sessionType) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card 
          className="bg-gray-900 border-gray-700 cursor-pointer hover:border-brand-gold transition-colors"
          onClick={() => setSessionType('guided')}
        >
          <CardHeader>
            <CardTitle className="text-brand-gold">Meditación Guiada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4">
              Ejercicios de respiración predefinidos con patrones optimizados
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <div>• Patrón 4-4-4 (principiantes)</div>
              <div>• Patrón 4-7-8 (relajación)</div>
              <div>• Patrón 6-6-6 (avanzado)</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gray-900 border-gray-700 cursor-pointer hover:border-brand-gold transition-colors"
          onClick={() => setSessionType('free')}
        >
          <CardHeader>
            <CardTitle className="text-brand-gold">Meditación Libre</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4">
              Personaliza completamente tu sesión de meditación
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <div>• Duración personalizada</div>
              <div>• Tiempos de respiración ajustables</div>
              <div>• Opciones de sonido personalizables</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-brand-gold">
          Configurar {sessionType === 'guided' ? 'Meditación Guiada' : 'Meditación Libre'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Duración (minutos)</Label>
            <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutos</SelectItem>
                <SelectItem value="10">10 minutos</SelectItem>
                <SelectItem value="15">15 minutos</SelectItem>
                <SelectItem value="20">20 minutos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sessionType === 'guided' && (
            <div className="space-y-2">
              <Label className="text-white">Patrón de Respiración</Label>
              <Select value="4-4-4" onValueChange={() => {}}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4-4-4">4-4-4 (Equilibrio)</SelectItem>
                  <SelectItem value="4-7-8">4-7-8 (Relajación)</SelectItem>
                  <SelectItem value="6-6-6">6-6-6 (Profundo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {sessionType === 'free' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Inhalar (s)</Label>
                <Input
                  type="number"
                  value={inhaleTime}
                  onChange={(e) => setInhaleTime(parseInt(e.target.value) || 4)}
                  className="bg-gray-800 border-gray-600 text-white"
                  min={1}
                  max={10}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Mantener (s)</Label>
                <Input
                  type="number"
                  value={holdTime}
                  onChange={(e) => setHoldTime(parseInt(e.target.value) || 4)}
                  className="bg-gray-800 border-gray-600 text-white"
                  min={1}
                  max={15}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Exhalar (s)</Label>
                <Input
                  type="number"
                  value={exhaleTime}
                  onChange={(e) => setExhaleTime(parseInt(e.target.value) || 4)}
                  className="bg-gray-800 border-gray-600 text-white"
                  min={1}
                  max={15}
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-white">Sonido 435 Hz</Label>
              <Switch
                checked={enable435Hz}
                onCheckedChange={setEnable435Hz}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-white">Sonido de Cuenco Tibetano</Label>
              <Switch
                checked={enableBowl}
                onCheckedChange={setEnableBowl}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={startSession} className="bg-brand-gold text-black flex-1">
            <Play size={16} className="mr-2" />
            Comenzar Meditación
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setSessionType(null)}
            className="border-brand-gold text-brand-gold"
          >
            Atrás
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MeditationSession;
