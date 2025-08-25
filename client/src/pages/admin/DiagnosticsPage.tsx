import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, Database, Folder, Server, FileText, RefreshCw } from 'lucide-react';

interface DiagnosticsData {
  database: {
    connected: boolean;
    test_query_rows: number;
  };
  filesystem: {
    data_directory_exists: boolean;
    uploads_directory_exists: boolean;
    data_path: string;
    uploads_path: string;
  };
  environment: {
    NODE_ENV: string;
    BUILD_MODE: string;
    INSTANCE_APP_BUILD: string;
    DATA_DIRECTORY: string;
    VAPID_CONFIGURED: boolean;
  };
  timestamp: string;
}

interface SystemLog {
  id: number;
  level: string;
  event: string;
  user_id: number | null;
  route: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: string | null;
  created_at: string;
}

const DiagnosticsPage: React.FC = () => {
  const { toast } = useToast();
  const [diagnostics, setDiagnostics] = React.useState<DiagnosticsData | null>(null);
  const [logs, setLogs] = React.useState<SystemLog[]>([]);
  const [selectedLevel, setSelectedLevel] = React.useState<string>('all');
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/diagnostics', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDiagnostics(data);
        console.log('Diagnostics fetched:', data);
      } else {
        throw new Error('Failed to fetch diagnostics');
      }
    } catch (error) {
      console.error('Error fetching diagnostics:', error);
      toast({
        title: "Error",
        description: "No se pudieron obtener los diagnósticos del sistema",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async (level?: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const url = level && level !== 'all' 
        ? `/api/system-logs?level=${level}&limit=50`
        : '/api/system-logs?limit=50';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data);
        console.log('System logs fetched:', data.length);
      } else {
        throw new Error('Failed to fetch logs');
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "Error",
        description: "No se pudieron obtener los logs del sistema",
        variant: "destructive",
      });
    }
  };

  React.useEffect(() => {
    fetchDiagnostics();
    fetchLogs();
  }, []);

  React.useEffect(() => {
    fetchLogs(selectedLevel);
  }, [selectedLevel]);

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <AlertTriangle className="w-5 h-5 text-red-600" />
    );
  };

  const getStatusBadge = (status: boolean) => {
    return (
      <Badge variant={status ? "default" : "destructive"}>
        {status ? "OK" : "Error"}
      </Badge>
    );
  };

  const getLevelBadge = (level: string) => {
    const variants = {
      info: "default",
      warn: "secondary",
      error: "destructive",
      critical: "destructive"
    };
    
    return (
      <Badge variant={variants[level as keyof typeof variants] || "default"}>
        {level.toUpperCase()}
      </Badge>
    );
  };

  const formatMetadata = (metadata: string | null) => {
    if (!metadata) return null;
    
    try {
      const parsed = JSON.parse(metadata);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return metadata;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Diagnósticos del Sistema</h1>
            <p className="text-muted-foreground">
              Estado del sistema y logs para depuración
            </p>
          </div>
          <Button onClick={fetchDiagnostics} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="status" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="status">Estado del Sistema</TabsTrigger>
          <TabsTrigger value="logs">Logs del Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-6">
          {diagnostics ? (
            <>
              {/* Database Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Base de Datos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span>Conexión:</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(diagnostics.database.connected)}
                        {getStatusBadge(diagnostics.database.connected)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Test Query:</span>
                      <span className="font-medium">{diagnostics.database.test_query_rows} filas</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* File System Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Folder className="w-5 h-5" />
                    Sistema de Archivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Directorio de Datos:</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(diagnostics.filesystem.data_directory_exists)}
                        {getStatusBadge(diagnostics.filesystem.data_directory_exists)}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Ruta: {diagnostics.filesystem.data_path}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Directorio de Uploads:</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(diagnostics.filesystem.uploads_directory_exists)}
                        {getStatusBadge(diagnostics.filesystem.uploads_directory_exists)}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Ruta: {diagnostics.filesystem.uploads_path}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Environment Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Variables de Entorno
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span>NODE_ENV:</span>
                      <Badge variant="outline">{diagnostics.environment.NODE_ENV}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>BUILD_MODE:</span>
                      <Badge variant="outline">{diagnostics.environment.BUILD_MODE}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>INSTANCE_APP_BUILD:</span>
                      <Badge variant="outline">{diagnostics.environment.INSTANCE_APP_BUILD}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>VAPID Configurado:</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(diagnostics.environment.VAPID_CONFIGURED)}
                        {getStatusBadge(diagnostics.environment.VAPID_CONFIGURED)}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-sm text-muted-foreground">
                        Data Directory: {diagnostics.environment.DATA_DIRECTORY}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timestamp */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-sm text-muted-foreground">
                    Última actualización: {new Date(diagnostics.timestamp).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Server className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  {isLoading ? 'Cargando diagnósticos...' : 'Error al cargar diagnósticos'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {isLoading ? 'Obteniendo el estado del sistema...' : 'No se pudieron obtener los diagnósticos del sistema'}
                </p>
                {!isLoading && (
                  <Button onClick={fetchDiagnostics}>
                    Reintentar
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          {/* Log Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros de Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium">Nivel:</label>
                  <select 
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="ml-2 px-3 py-1 border rounded-md"
                  >
                    <option value="all">Todos</option>
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fetchLogs(selectedLevel)}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar Logs
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Logs del Sistema ({logs.length})
              </CardTitle>
              <CardDescription>
                Últimos eventos y errores del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <Card key={log.id} className="border-l-4 border-l-gray-300">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getLevelBadge(log.level)}
                            <span className="font-medium">{log.event}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          {log.user_id && <div>Usuario ID: {log.user_id}</div>}
                          {log.route && <div>Ruta: {log.route}</div>}
                          {log.ip_address && <div>IP: {log.ip_address}</div>}
                          
                          {log.metadata && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                Ver Metadata
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                                {formatMetadata(log.metadata)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay logs disponibles para el filtro seleccionado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DiagnosticsPage;
