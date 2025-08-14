import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  useStepSyncSettings, 
  useUpdateStepSyncSettings, 
  useGoogleFitAuth,
  useAppleHealthAuth,
  useSyncSteps,
  useForceSync
} from '@/hooks/api/use-step-sync';
import {
  initializeGoogleFit,
  authenticateGoogleFit,
  getGoogleFitSteps,
  requestAppleHealthKitPermission,
  getAppleHealthKitSteps,
  getPlatform,
  getUserTimezone,
  setupBackgroundSync,
  formatLastSync
} from '@/utils/step-tracking';
import { Smartphone, Activity, RefreshCw, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';

const StepSyncSettings: React.FC = () => {
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  
  // API hooks
  const { data: settings, isLoading } = useStepSyncSettings();
  const updateSettingsMutation = useUpdateStepSyncSettings();
  const googleFitAuthMutation = useGoogleFitAuth();
  const appleHealthAuthMutation = useAppleHealthAuth();
  const syncStepsMutation = useSyncSteps();
  const forceSyncMutation = useForceSync();

  const platform = getPlatform();
  const supportsGoogleFit = platform === 'android' || platform === 'web';
  const supportsAppleHealth = platform === 'ios';

  // Initialize Google Fit on component mount if needed
  React.useEffect(() => {
    if (supportsGoogleFit && settings?.googleFitEnabled && !settings?.hasGoogleFitToken) {
      setIsInitializing(true);
      initializeGoogleFit()
        .then(() => {
          console.log('Google Fit initialized successfully');
        })
        .catch((error) => {
          console.error('Google Fit initialization failed:', error);
        })
        .finally(() => {
          setIsInitializing(false);
        });
    }
  }, [supportsGoogleFit, settings?.googleFitEnabled, settings?.hasGoogleFitToken]);

  // Setup background sync
  React.useEffect(() => {
    if (!settings?.googleFitEnabled && !settings?.appleHealthEnabled) {
      return;
    }

    const cleanup = setupBackgroundSync(async () => {
      await performSync();
    });

    return cleanup;
  }, [settings?.googleFitEnabled, settings?.appleHealthEnabled]);

  // Sync function
  const performSync = async (): Promise<void> => {
    if (isSyncing) return;

    setIsSyncing(true);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const timezone = getUserTimezone();
      let steps = 0;
      let source: 'google_fit' | 'apple_health';

      if (settings?.googleFitEnabled && settings?.hasGoogleFitToken && supportsGoogleFit) {
        steps = await getGoogleFitSteps(today);
        source = 'google_fit';
      } else if (settings?.appleHealthEnabled && supportsAppleHealth) {
        steps = await getAppleHealthKitSteps(today);
        source = 'apple_health';
      } else {
        return; // No sync source available
      }

      if (steps > 0) {
        await syncStepsMutation.mutateAsync({
          steps,
          date: today,
          source,
          timezone,
        });

        console.log(`Synced ${steps} steps from ${source}`);
      }
    } catch (error) {
      console.error('Background sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleFitToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        // Enable Google Fit
        setIsInitializing(true);
        await initializeGoogleFit();
        const authData = await authenticateGoogleFit();
        await googleFitAuthMutation.mutateAsync(authData);
        
        toast({
          title: "Google Fit conectado",
          description: "Los pasos se sincronizarán automáticamente",
          variant: "success",
        });
      } else {
        // Disable Google Fit
        await updateSettingsMutation.mutateAsync({ googleFitEnabled: false });
        
        toast({
          title: "Google Fit desconectado",
          description: "La sincronización automática se ha desactivado",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Google Fit toggle error:', error);
      toast({
        title: "Error con Google Fit",
        description: error instanceof Error ? error.message : "No se pudo conectar con Google Fit",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleAppleHealthToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        // Request Apple Health permission
        const granted = await requestAppleHealthKitPermission();
        
        if (granted) {
          await appleHealthAuthMutation.mutateAsync();
          
          toast({
            title: "Apple Health conectado",
            description: "Los pasos se sincronizarán automáticamente",
            variant: "success",
          });
        } else {
          throw new Error('Permisos de Apple Health denegados');
        }
      } else {
        // Disable Apple Health
        await updateSettingsMutation.mutateAsync({ appleHealthEnabled: false });
        
        toast({
          title: "Apple Health desconectado",
          description: "La sincronización automática se ha desactivado",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Apple Health toggle error:', error);
      toast({
        title: "Error con Apple Health",
        description: error instanceof Error ? error.message : "No se pudo conectar con Apple Health",
        variant: "destructive",
      });
    }
  };

  const handleForceSync = async () => {
    try {
      setIsSyncing(true);
      await performSync();
      await forceSyncMutation.mutateAsync();
      
      toast({
        title: "Sincronización completada",
        description: "Los datos de pasos se han actualizado",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error en sincronización",
        description: "No se pudieron sincronizar los datos",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Cargando configuración de pasos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Sincronización Automática de Pasos
          </CardTitle>
          <CardDescription>
            Conecta tu teléfono para sincronizar pasos automáticamente desde Google Fit o Apple Health
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Platform Support Info */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Plataforma detectada</div>
              <div className="text-xs text-muted-foreground">
                {platform === 'android' && 'Android - Compatible con Google Fit'}
                {platform === 'ios' && 'iOS - Compatible con Apple Health'}
                {platform === 'web' && 'Web - Compatible con Google Fit'}
              </div>
            </div>
          </div>

          {/* Google Fit Settings */}
          {supportsGoogleFit && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold text-sm">G</span>
                  </div>
                  <div>
                    <Label className="text-base font-medium">Google Fit</Label>
                    <p className="text-sm text-muted-foreground">
                      Sincronizar pasos desde Google Fit
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {settings?.hasGoogleFitToken && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Conectado
                    </Badge>
                  )}
                  
                  <Switch
                    checked={settings?.googleFitEnabled || false}
                    onCheckedChange={handleGoogleFitToggle}
                    disabled={isInitializing || googleFitAuthMutation.isPending || updateSettingsMutation.isPending}
                  />
                </div>
              </div>

              {settings?.googleFitEnabled && !settings?.hasGoogleFitToken && (
                <div className="ml-11 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-700">
                      <p className="font-medium mb-1">Autorización pendiente</p>
                      <p>Necesitas autorizar el acceso a Google Fit para sincronizar los pasos.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Apple Health Settings */}
          {supportsAppleHealth && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 text-lg">♥</span>
                    </div>
                    <div>
                      <Label className="text-base font-medium">Apple Health</Label>
                      <p className="text-sm text-muted-foreground">
                        Sincronizar pasos desde Apple Health
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {settings?.appleHealthEnabled && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Conectado
                      </Badge>
                    )}
                    
                    <Switch
                      checked={settings?.appleHealthEnabled || false}
                      onCheckedChange={handleAppleHealthToggle}
                      disabled={appleHealthAuthMutation.isPending || updateSettingsMutation.isPending}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Sync Status */}
          {(settings?.googleFitEnabled || settings?.appleHealthEnabled) && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium">Estado de Sincronización</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Última sincronización
                    </div>
                    <div className="text-sm font-medium">
                      {formatLastSync(settings?.lastSyncAt)}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Activity className="w-4 h-4" />
                      Fecha sincronizada
                    </div>
                    <div className="text-sm font-medium">
                      {settings?.lastSyncDate || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleForceSync}
                    disabled={isSyncing || forceSyncMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
                  </Button>

                  {isSyncing && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Zap className="w-4 h-4" />
                      Obteniendo datos...
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Sync Errors */}
          {settings?.syncErrors && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                  <p className="font-medium mb-1">Error en sincronización</p>
                  <p>{settings.syncErrors}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-800">Información sobre Sincronización</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Los pasos se sincronizan automáticamente cada 6 horas cuando la app está activa</li>
                <li>• La sincronización también ocurre al abrir la aplicación</li>
                <li>• Los datos se guardan según tu zona horaria local</li>
                <li>• Si hay conflicto, se mantiene el valor más alto entre manual y automático</li>
                <li>• La sincronización automática respeta tu privacidad y solo lee datos de pasos</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No Support Card */}
      {!supportsGoogleFit && !supportsAppleHealth && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-800 mb-2">Sincronización No Disponible</h4>
                <p className="text-sm text-orange-700">
                  La sincronización automática de pasos no está disponible en esta plataforma. 
                  Puedes seguir ingresando tus pasos manualmente desde el dashboard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StepSyncSettings;
