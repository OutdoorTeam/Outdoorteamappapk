import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import UserTrainingPlanEditor from './UserTrainingPlanEditor';
import UserGoalsEditor from './UserGoalsEditor';
import { ArrowLeft, User, Dumbbell, Target, FileText, Mail, Calendar, Crown } from 'lucide-react';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  plan_type: string | null;
  is_active: boolean;
  features: {
    habits: boolean;
    training: boolean;
    nutrition: boolean;
    meditation: boolean;
    active_breaks: boolean;
  };
  created_at: string;
}

interface UserDetailPanelProps {
  user: User;
  onClose: () => void;
}

const UserDetailPanel: React.FC<UserDetailPanelProps> = ({ user, onClose }) => {
  const { user: currentUser } = useAuth();

  const getFeatureIcon = (featureKey: string, enabled: boolean) => {
    const icons = {
      training: '💪',
      nutrition: '🥗',
      meditation: '🧘',
      active_breaks: '☕',
      habits: '📈'
    };
    
    return (
      <span className={enabled ? 'text-green-600' : 'text-gray-400'}>
        {icons[featureKey as keyof typeof icons] || '📋'}
      </span>
    );
  };

  const getFeatureName = (featureKey: string) => {
    const names = {
      training: 'Entrenamiento',
      nutrition: 'Nutrición',
      meditation: 'Meditación',
      active_breaks: 'Pausas Activas',
      habits: 'Hábitos'
    };
    
    return names[featureKey as keyof typeof names] || featureKey;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="outline" onClick={onClose} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Usuarios
        </Button>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            {user.role === 'admin' ? (
              <Crown className="w-8 h-8 text-yellow-600" />
            ) : (
              <User className="w-8 h-8 text-blue-600" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{user.full_name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                {user.role === 'admin' ? 'Administrador' : 'Usuario'}
              </Badge>
              <Badge variant={user.is_active ? 'default' : 'destructive'}>
                {user.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
              {user.plan_type && (
                <Badge variant="outline">
                  {user.plan_type}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Info Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Información del Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="font-medium">{user.email}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Registrado:</span>
                <span className="font-medium">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground block mb-2">Características Activas:</span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(user.features).map(([key, enabled]) => (
                    <div
                      key={key}
                      className={`flex items-center gap-2 p-2 rounded text-sm ${
                        enabled 
                          ? 'bg-green-50 text-green-800 border border-green-200' 
                          : 'bg-gray-50 text-gray-500 border border-gray-200'
                      }`}
                    >
                      {getFeatureIcon(key, enabled)}
                      <span>{getFeatureName(key)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Management Tabs */}
      <Tabs defaultValue="goals" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Metas Personalizadas
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Plan de Entrenamiento
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Archivos
          </TabsTrigger>
        </TabsList>

        {/* Goals Tab */}
        <TabsContent value="goals">
          <UserGoalsEditor user={user} />
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training">
          <UserTrainingPlanEditor user={user} />
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Gestión de Archivos para {user.full_name}
              </CardTitle>
              <CardDescription>
                Administra los archivos de entrenamiento y nutrición del usuario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>La gestión de archivos se implementará próximamente</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserDetailPanel;
