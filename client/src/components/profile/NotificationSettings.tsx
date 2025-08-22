import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useNotificationPreferences, 
  useUpdateNotificationPreferences,
  useSendTestNotification 
} from '@/hooks/api/use-notifications';
import {
  setupPushNotifications,
  isNotificationSupported,
  getNotificationPermission,
  sendTestNotification
} from '@/utils/notifications';
import { Bell, BellOff, Clock, TestTube, Smartphone, AlertCircle } from 'lucide-react';

const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isSettingUp, setIsSettingUp] = React.useState(false);
  const [permissionStatus, setPermissionStatus] = React.useState<NotificationPermission>('default');

  // API hooks
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferencesMutation = useUpdateNotificationPreferences();
  const sendTestMutation = useSendTestNotification();

  // Check notification permission on component mount
  React.useEffect(() => {
    if (isNotificationSupported()) {
      setPermissionStatus(getNotificationPermission());
    }
  }, []);

  // Available habits based on user features
  const getAvailableHabits = () => {
    const habits = [];

    if (user?.features?.training || user?.role === 'admin') {
      habits.push({ key: 'training_completed', name: 'Entrenamiento', icon: '💪' });
    }
    if (user?.features?.nutrition || user?.role === 'admin') {
      habits.push({ key: 'nutrition_completed', name: 'Nutrición', icon: '🥗' });
    }
    habits.push({ key: 'movement_completed', name: 'Pasos Diarios', icon: '👟' });
    if (user?.features?.meditation || user?.role === 'admin') {
      habits.push({ key: 'meditation_completed', name: 'Meditación', icon: '🧘' });
    }

    return habits;
  };

  // Generate time options
  const getTimeOptions = () => {
    const times = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        times.push({ value: timeStr, label: displayTime });
      }
    }
    return times;
  };

  const handleEnableNotifications = async () => {
    setIsSettingUp(true);
    
    try {
      // Setup push notifications
      await setupPushNotifications();
      
      // Update permission status
      setPermissionStatus(getNotificationPermission());
      
      // Update preferences to enabled
      await updatePreferencesMutation.mutateAsync({
        enabled: true,
        habits: preferences?.habits || [],
        times: preferences?.times || {}
      });

      toast({
        title: "¡Notificaciones activadas!",
        description: "Ahora recibirás recordatorios de tus hábitos",
        variant: "success",
      });
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: "Error al activar notificaciones",
        description: error instanceof Error ? error.message : "No se pudieron activar las notificaciones",
        variant: "destructive",
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleDisableNotifications = async () => {
    try {
      await updatePreferencesMutation.mutateAsync({
        enabled: false,
        habits: preferences?.habits || [],
        times: preferences?.times || {}
      });

      toast({
        title: "Notificaciones desactivadas",
        description: "Ya no recibirás recordatorios automáticos",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron desactivar las notificaciones",
        variant: "destructive",
      });
    }
  };

  const handleHabitToggle = async (habitKey: string, enabled: boolean) => {
    const currentHabits = preferences?.habits || [];
    const updatedHabits = enabled 
      ? [...currentHabits, habitKey]
      : currentHabits.filter(h => h !== habitKey);

    try {
      await updatePreferencesMutation.mutateAsync({
        enabled: preferences?.enabled || false,
        habits: updatedHabits,
        times: preferences?.times || {}
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración",
        variant: "destructive",
      });
    }
  };

  const handleTimeChange = async (habitKey: string, time: string) => {
    const updatedTimes = {
      ...(preferences?.times || {}),
      [habitKey]: time
    };

    try {
      await updatePreferencesMutation.mutateAsync({
        enabled: preferences?.enabled || false,
        habits: preferences?.habits || [],
        times: updatedTimes
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el horario",
        variant: "destructive",
      });
    }
  };

  const handleTestNotification = async () => {
    try {
      if (permissionStatus === 'granted') {
        // Try local notification first
        await sendTestNotification();
        toast({
          title: "Notificación de prueba enviada",
          description: "Deberías ver una notificación ahora",
          variant: "success",
        });
      } else {
        // Try server notification
        await sendTestMutation.mutateAsync();
        toast({
          title: "Notificación de prueba enviada",
          description: "Se envió una notificación de prueba desde el servidor",
          variant: "success",
        });
      }
    } catch (error) {
      toast({
        title: "Error en prueba",
        description: "No se pudo enviar la notificación de prueba",
        variant: "destructive",
      });
    }
  };

  const availableHabits = getAvailableHabits();
  const timeOptions = getTimeOptions();
  const isNotificationsEnabled = preferences?.enabled || false;
  const isSupported = isNotificationSupported();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Cargando configuración de notificaciones...</div>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5 text-orange-600" />
            Notificaciones No Disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-orange-800">
                Tu navegador no es compatible con notificaciones push. 
                Para recibir recordatorios, recomendamos usar Chrome, Firefox o Safari en su última versión.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Notification Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isNotificationsEnabled ? (
              <Bell className="w-5 h-5 text-green-600" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-500" />
            )}
            Notificaciones Push
          </CardTitle>
          <CardDescription>
            Recibe recordatorios personalizados para mantener tus hábitos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Permission Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Estado de Permisos</div>
                <div className="text-xs text-muted-foreground">
                  {permissionStatus === 'granted' && 'Permitidas'}
                  {permissionStatus === 'denied' && 'Bloqueadas'}
                  {permissionStatus === 'default' && 'No configuradas'}
                </div>
              </div>
            </div>
            <div className={`px-2 py-1 text-xs rounded-full ${
              permissionStatus === 'granted' ? 'bg-green-100 text-green-800' :
              permissionStatus === 'denied' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {permissionStatus === 'granted' && '✓ Activas'}
              {permissionStatus === 'denied' && '✗ Bloqueadas'}
              {permissionStatus === 'default' && '○ Pendientes'}
            </div>
          </div>

          {/* Main Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Activar Notificaciones</Label>
              <p className="text-sm text-muted-foreground">
                Recibe recordatorios automáticos en tu dispositivo
              </p>
            </div>
            <div className="flex items-center gap-3">
              {permissionStatus !== 'granted' && !isNotificationsEnabled && (
                <Button
                  onClick={handleEnableNotifications}
                  disabled={isSettingUp || updatePreferencesMutation.isPending}
                  size="sm"
                >
                  {isSettingUp ? 'Configurando...' : 'Activar'}
                </Button>
              )}
              {permissionStatus === 'granted' && (
                <Switch
                  checked={isNotificationsEnabled}
                  onCheckedChange={isNotificationsEnabled ? handleDisableNotifications : handleEnableNotifications}
                  disabled={isSettingUp || updatePreferencesMutation.isPending}
                />
              )}
            </div>
          </div>

          {/* Test Notification */}
          {permissionStatus === 'granted' && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                disabled={sendTestMutation.isPending}
                className="flex items-center gap-2"
              >
                <TestTube className="w-4 h-4" />
                {sendTestMutation.isPending ? 'Enviando...' : 'Probar Notificación'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Habit-specific Settings */}
      {isNotificationsEnabled && permissionStatus === 'granted' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Recordatorios por Hábito
            </CardTitle>
            <CardDescription>
              Configura cuándo quieres ser recordado para cada actividad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableHabits.map((habit) => {
                const isHabitEnabled = (preferences?.habits || []).includes(habit.key);
                const habitTime = preferences?.times?.[habit.key] || '09:00';

                return (
                  <div key={habit.key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{habit.icon}</div>
                      <div>
                        <Label className="text-sm font-medium">{habit.name}</Label>
                        <p className="text-xs text-muted-foreground">
                          Recordatorio para completar tu {habit.name.toLowerCase()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {isHabitEnabled && (
                        <Select 
                          value={habitTime} 
                          onValueChange={(time) => handleTimeChange(habit.key, time)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((time) => (
                              <SelectItem key={time.value} value={time.value}>
                                {time.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      <Switch
                        checked={isHabitEnabled}
                        onCheckedChange={(enabled) => handleHabitToggle(habit.key, enabled)}
                        disabled={updatePreferencesMutation.isPending}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-800">Información sobre Notificaciones</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Las notificaciones funcionan incluso cuando la app está cerrada</li>
                <li>• Puedes tocar en "Marcar Completado" directamente desde la notificación</li>
                <li>• Los recordatorios se envían según la zona horaria de tu dispositivo</li>
                <li>• Puedes cambiar los permisos desde la configuración de tu navegador</li>
                <li>• Las notificaciones se pausan automáticamente si ya completaste el hábito</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Denied Help */}
      {permissionStatus === 'denied' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-800 mb-2">Notificaciones Bloqueadas</h4>
                <p className="text-sm text-red-700 mb-3">
                  Las notificaciones están bloqueadas en tu navegador. Para activarlas:
                </p>
                <ol className="text-sm text-red-700 list-decimal list-inside space-y-1">
                  <li>Haz clic en el ícono de candado en la barra de direcciones</li>
                  <li>Cambia "Notificaciones" a "Permitir"</li>
                  <li>Recarga esta página</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationSettings;
