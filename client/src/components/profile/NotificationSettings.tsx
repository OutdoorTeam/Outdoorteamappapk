import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BellOff, AlertCircle } from 'lucide-react';

const NotificationSettings: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellOff className="w-5 h-5 text-gray-500" />
          Notificaciones No Disponibles
        </CardTitle>
        <CardDescription>
          Las notificaciones push han sido desactivadas del sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-800 mb-2">
              <strong>Las notificaciones push no están disponibles en este momento.</strong>
            </p>
            <p className="text-sm text-gray-600">
              Esta funcionalidad ha sido desactivada. Puedes seguir usando todas las demás 
              características de la aplicación normalmente.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
