import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Play, Pause, Square, RotateCcw, Settings, Brain, Heart, Moon } from 'lucide-react';

type MeditationMode = 'guided' | 'free' | null;
type MeditationPhase = 'inhale' | 'hold' | 'exhale' | 'pause';

const MeditationPage: React.FC = () => {
  const { user } = useAuth();
  
  // Session configuration
  const [mode, setMode] = React.useState<MeditationMode>(null);
  const [duration, setDuration] = React.useState(5);
  const [inhaleTime, setInhaleTime] = React.useState(4);
  const [holdTime, setHoldTime] = React.useState(4);
  const [exhaleTime, setExhaleTime] = React.useState(4);
  const [enable435Hz, setEnable435Hz] = React.useState(false);
  const [enableTibetanBowl, setEnableTibetanBowl] = React.useState(false);
  
  // Session state
  const [isActive, setIsActive] = React.useState(false);
  const [currentPhase, setCurrentPhase] = React.useState<MeditationPhase>('inhale');
  const [phaseTime, setPhaseTime] = React.useState(0);
  const [totalTime, setTotalTime] = React.useState(0);
  const [sphereScale, setSphereScale] = React.useState(0.5);
  const [cycleCount, setCycleCount] = React.useState(0);
  
  // Audio
  const [audioContext, setAudioContext] = React.useState<AudioContext | null>(null);
  const [hzOscillator, setHzOscillator] = React.useState<OscillatorNode | null>(null);
  
  // Post-session
  const [showCommentDialog, setShowCommentDialog] = React.useState(false);
  const [sessionComment, setSessionComment] = React.useState('');
  const [meditationSessions, setMeditationSessions] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const phaseIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    fetchMeditationSessions();
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
  }, []);

  const fetchMeditationSessions = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/meditation-sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const sessions = await response.json();
        setMeditationSessions(sessions);
      }
    } catch (error) {
      console.error('Error fetching meditation sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const playTibetanBowl = () => {
    if (!enableTibetanBowl || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 2);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 3);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 3);
  };

  const getCurrentCycleTimes = () => {
    if (mode === 'guided') {
      return { inhale: 4, hold: 4, exhale: 4 };
    }
    return { inhale: inhaleTime, hold: holdTime, exhale: exhaleTime };
  };

  const startSession = async () => {
    await initializeAudio();
    setIsActive(true);
    setCurrentPhase('inhale');
    setPhaseTime(0);
    setTotalTime(0);
    setCycleCount(0);
    
    // Start main timer
    intervalRef.current = setInterval(() => {
      setTotalTime(prev => {
        const newTime = prev + 1;
        if (newTime >= duration * 60) {
          completeSession();
        }
        return newTime;
      });
    }, 1000);

    startPhaseTimer();
  };

  const startPhaseTimer = () => {
    const cycleTimes = getCurrentCycleTimes();

    phaseIntervalRef.current = setInterval(() => {
      setPhaseTime(prev => {
        const newTime = prev + 0.1;
        const phaseTarget = cycleTimes[currentPhase as keyof typeof cycleTimes];
        
        // Update sphere animation
        if (currentPhase === 'inhale') {
          setSphereScale(0.5 + (newTime / phaseTarget) * 0.5);
        } else if (currentPhase === 'exhale') {
          setSphereScale(1 - (newTime / phaseTarget) * 0.5);
        } else if (currentPhase === 'hold') {
          setSphereScale(1);
        }
        
        if (newTime >= phaseTarget) {
          // Move to next phase
          const phases: MeditationPhase[] = ['inhale', 'hold', 'exhale'];
          const currentIndex = phases.indexOf(currentPhase);
          const nextPhase = phases[(currentIndex + 1) % phases.length];
          
          if (nextPhase === 'inhale' && currentPhase === 'exhale') {
            setCycleCount(prev => prev + 1);
            playTibetanBowl();
          }
          
          setCurrentPhase(nextPhase);
          return 0;
        }
        
        return newTime;
      });
    }, 100);
  };

  const pauseSession = () => {
    setIsActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
  };

  const resumeSession = () => {
    setIsActive(true);
    
    // Restart main timer
    intervalRef.current = setInterval(() => {
      setTotalTime(prev => {
        const newTime = prev + 1;
        if (newTime >= duration * 60) {
          completeSession();
        }
        return newTime;
      });
    }, 1000);
    
    startPhaseTimer();
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

  const resetSession = () => {
    setMode(null);
    setIsActive(false);
    setTotalTime(0);
    setPhaseTime(0);
    setSphereScale(0.5);
    setCycleCount(0);
    setShowCommentDialog(false);
    setSessionComment('');
    
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
    if (hzOscillator) {
      hzOscillator.stop();
      hzOscillator.disconnect();
      setHzOscillator(null);
    }
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }
  };

  const saveSession = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      await fetch('/api/meditation-sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          duration_minutes: Math.floor(totalTime / 60),
          meditation_type: mode || 'free',
          comment: sessionComment,
          breathing_cycle_json: JSON.stringify(getCurrentCycleTimes())
        })
      });

      // Update habit if user has meditation feature
      if (user?.features?.meditation) {
        await fetch('/api/daily-habits/update', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            date: new Date().toISOString().split('T')[0],
            meditation_completed: true
          })
        });
      }
      
      alert('¡Sesión de meditación completada! Se agregó a tu progreso diario.');
      fetchMeditationSessions();
      resetSession();
    } catch (error) {
      console.error('Error saving meditation session:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseText = () => {
    switch (currentPhase) {
      case 'inhale': return 'Inhala profundamente';
      case 'hold': return 'Mantén la respiración';
      case 'exhale': return 'Exhala lentamente';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando meditación...</div>
      </div>
    );
  }

  // Post-session comment dialog
  if (showCommentDialog) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-primary">¡Sesión Completada! 🧘‍♀️</CardTitle>
            <CardDescription className="text-center">
              Has completado {Math.floor(totalTime / 60)} minutos de meditación con {cycleCount} ciclos respiratorios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-10 h-10 text-green-600" />
              </div>
              <p className="text-muted-foreground">
                ¡Excelente trabajo! Tu práctica consistente de meditación contribuye a tu bienestar mental y físico.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>¿Cómo te sentiste durante esta sesión? (opcional)</Label>
              <Textarea
                value={sessionComment}
                onChange={(e) => setSessionComment(e.target.value)}
                placeholder="Comparte tu experiencia: ¿te sentiste relajado, concentrado, distraído? Cualquier observación es valiosa..."
                className="min-h-[100px]"
                rows={4}
              />
            </div>
            
            <div className="flex gap-3">
              <Button onClick={saveSession} className="flex-1" size="lg">
                Guardar Sesión
              </Button>
              <Button variant="outline" onClick={resetSession} className="flex-1" size="lg">
                Nueva Sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active meditation session
  if (isActive || (mode && totalTime > 0)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto bg-gradient-to-br from-blue-50 to-purple-50">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Time display */}
              <div className="text-4xl font-bold text-primary">
                {formatTime(totalTime)}
              </div>
              
              {/* Breathing sphere */}
              <div className="flex justify-center">
                <div 
                  className="w-40 h-40 rounded-full bg-gradient-to-br from-primary to-blue-400 transition-all duration-300 flex items-center justify-center shadow-2xl"
                  style={{ 
                    transform: `scale(${sphereScale})`,
                    boxShadow: `0 0 ${sphereScale * 60}px rgba(59, 130, 246, 0.4)`
                  }}
                >
                  <div className="text-white font-medium text-lg">
                    {Math.ceil(getCurrentCycleTimes()[currentPhase as keyof ReturnType<typeof getCurrentCycleTimes>] - phaseTime)}
                  </div>
                </div>
              </div>
              
              {/* Instructions */}
              <div>
                <div className="text-xl font-medium text-gray-700 mb-2">
                  {getPhaseText()}
                </div>
                <div className="text-sm text-gray-500">
                  Ciclo {cycleCount + 1} • {currentPhase}
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex justify-center gap-4">
                {isActive ? (
                  <Button onClick={pauseSession} variant="outline" size="lg">
                    <Pause size={20} className="mr-2" />
                    Pausar
                  </Button>
                ) : (
                  <Button onClick={resumeSession} size="lg">
                    <Play size={20} className="mr-2" />
                    Continuar
                  </Button>
                )}
                <Button onClick={stopSession} variant="destructive" size="lg">
                  <Square size={20} className="mr-2" />
                  Finalizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mode selection screen
  if (!mode) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Meditación y Mindfulness</h1>
          <p className="text-muted-foreground">Elige tu tipo de práctica para comenzar</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-primary"
            onClick={() => setMode('guided')}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-center text-blue-600">Meditación Guiada</CardTitle>
              <CardDescription className="text-center">
                Patrones de respiración predefinidos y optimizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Patrón 4-4-4 (inhalación, retención, exhalación)</li>
                <li>• Ideal para principiantes</li>
                <li>• Esfera animada para seguir el ritmo</li>
                <li>• Opciones de sonido ambiente</li>
              </ul>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-green-500"
            onClick={() => setMode('free')}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-center text-green-600">Meditación Libre</CardTitle>
              <CardDescription className="text-center">
                Personaliza completamente tu experiencia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Configura tus propios tiempos de respiración</li>
                <li>• Duración personalizable (5, 10, 15 min)</li>
                <li>• Sonido de cuenco tibetano opcional</li>
                <li>• Control total de la experiencia</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Benefits section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-center">Beneficios de la Meditación Regular</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Brain className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-semibold mb-2">Mejora la Concentración</h4>
                <p className="text-sm text-muted-foreground">
                  Fortalece tu capacidad de mantener la atención y el enfoque mental
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Heart className="w-6 h-6 text-red-600" />
                </div>
                <h4 className="font-semibold mb-2">Reduce el Estrés</h4>
                <p className="text-sm text-muted-foreground">
                  Disminuye los niveles de cortisol y promueve la relajación profunda
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Moon className="w-6 h-6 text-indigo-600" />
                </div>
                <h4 className="font-semibold mb-2">Mejora el Sueño</h4>
                <p className="text-sm text-muted-foreground">
                  Ayuda a conciliar el sueño más rápido y tener un descanso más profundo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent sessions */}
        {meditationSessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tus Sesiones Recientes</CardTitle>
              <CardDescription>Historial de tu práctica de meditación</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {meditationSessions.slice(0, 5).map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">
                        {session.meditation_type === 'guided' ? 'Guiada' : 'Libre'} - {session.duration_minutes} min
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(session.completed_at).toLocaleDateString()}
                      </div>
                      {session.comment && (
                        <div className="text-sm text-muted-foreground mt-1 italic">
                          "{session.comment}"
                        </div>
                      )}
                    </div>
                    <div className="text-green-600 font-bold">
                      ✓
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Configuration screen
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {mode === 'guided' ? <Settings className="w-5 h-5" /> : <Brain className="w-5 h-5" />}
            Configurar {mode === 'guided' ? 'Meditación Guiada' : 'Meditación Libre'}
          </CardTitle>
          <CardDescription>
            {mode === 'guided' 
              ? 'Usa patrones de respiración optimizados para tu práctica'
              : 'Personaliza tu experiencia de meditación'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Duration selection */}
          <div className="space-y-2">
            <Label>Duración de la sesión</Label>
            <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
              <SelectTrigger>
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

          {/* Breathing pattern for free mode */}
          {mode === 'free' && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Tiempos de Respiración (segundos)</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Inhalación</Label>
                  <Input
                    type="number"
                    value={inhaleTime}
                    onChange={(e) => setInhaleTime(parseInt(e.target.value) || 4)}
                    min={1}
                    max={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Retención</Label>
                  <Input
                    type="number"
                    value={holdTime}
                    onChange={(e) => setHoldTime(parseInt(e.target.value) || 4)}
                    min={1}
                    max={15}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Exhalación</Label>
                  <Input
                    type="number"
                    value={exhaleTime}
                    onChange={(e) => setExhaleTime(parseInt(e.target.value) || 4)}
                    min={1}
                    max={15}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Audio options */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Opciones de Audio</Label>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Sonido 435 Hz</Label>
                  <p className="text-sm text-muted-foreground">Frecuencia relajante de fondo</p>
                </div>
                <Switch
                  checked={enable435Hz}
                  onCheckedChange={setEnable435Hz}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Cuenco Tibetano</Label>
                  <p className="text-sm text-muted-foreground">Sonido al completar cada ciclo</p>
                </div>
                <Switch
                  checked={enableTibetanBowl}
                  onCheckedChange={setEnableTibetanBowl}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={startSession} className="flex-1" size="lg">
              <Play size={20} className="mr-2" />
              Comenzar Meditación
            </Button>
            <Button variant="outline" onClick={() => setMode(null)} size="lg">
              <RotateCcw size={20} className="mr-2" />
              Volver
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MeditationPage;