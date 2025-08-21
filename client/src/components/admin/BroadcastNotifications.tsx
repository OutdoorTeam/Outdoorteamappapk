import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BellOff, AlertCircle } from 'lucide-react';

const BroadcastNotifications: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellOff className="w-5 h-5 text-gray-500" />
          Notificaciones Masivas No Disponibles
        </CardTitle>
        <CardDescription>
          El sistema de notificaciones push ha sido desactivado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-800 mb-2">
              <strong>Las notificaciones masivas no están disponibles.</strong>
            </p>
            <p className="text-sm text-gray-600">
              Esta funcionalidad ha sido desactivada del sistema. Los usuarios pueden 
              seguir usando todas las demás características de la aplicación normalmente.
            </p>
            <p className="text-sm text-gray-600 mt-3">
              Para comunicarte con los usuarios, considera usar otros canales como:
            </p>
            <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
              <li>Email directo</li>
              <li>Actualizaciones en el dashboard</li>
              <li>Anuncios en la aplicación</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BroadcastNotifications;
