import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useSendBroadcastNotification } from '@/hooks/api/use-notifications';
import { Send, Users, Bell } from 'lucide-react';

const BroadcastNotifications: React.FC = () => {
  const { toast } = useToast();
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [url, setUrl] = React.useState('/dashboard');
  
  const sendBroadcastMutation = useSendBroadcastNotification();

  const handleSendBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      toast({
        title: "Error de validación",
        description: "Título y mensaje son requeridos",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await sendBroadcastMutation.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || undefined
      });

      toast({
        title: "¡Notificación enviada!",
        description: `Se envió a ${result.sent} usuarios. ${result.failed} fallaron.`,
        variant: "success",
      });

      // Reset form
      setTitle('');
      setBody('');
      setUrl('/dashboard');
    } catch (error) {
      toast({
        title: "Error al enviar",
        description: "No se pudo enviar la notificación masiva",
        variant: "destructive",
      });
    }
  };

  const predefinedMessages = [
    {
      title: "🎯 ¡Alcanza tus metas!",
      body: "Recuerda completar tus hábitos diarios para mantener tu progreso. ¡Tú puedes!",
      url: "/dashboard"
    },
    {
      title: "🧘 Momento de relajación",
      body: "Toma un descanso y dedica unos minutos a la meditación. Tu mente te lo agradecerá.",
      url: "/meditation"
    },
    {
      title: "💪 ¡Es hora de moverse!",
      body: "Tu cuerpo necesita actividad. Revisa tu entrenamiento del día y ¡ponte en movimiento!",
      url: "/training"
    },
    {
      title: "📊 Revisa tu progreso",
      body: "Mira qué tan bien lo has estado haciendo en tu perfil. ¡Celebra tus logros!",
      url: "/profile"
    }
  ];

  const handleUsePredefined = (message: typeof predefinedMessages[0]) => {
    setTitle(message.title);
    setBody(message.body);
    setUrl(message.url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Enviar Notificación Masiva
          </CardTitle>
          <CardDescription>
            Envía una notificación push a todos los usuarios activos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: ¡Alcanza tus metas!"
              maxLength={50}
            />
            <div className="text-xs text-muted-foreground">
              {title.length}/50 caracteres
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Mensaje</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe un mensaje motivador para todos los usuarios..."
              rows={4}
              maxLength={200}
            />
            <div className="text-xs text-muted-foreground">
              {body.length}/200 caracteres
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL de destino (opcional)</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/dashboard"
            />
            <div className="text-xs text-muted-foreground">
              A dónde llevará la notificación cuando se toque
            </div>
          </div>

          <Button
            onClick={handleSendBroadcast}
            disabled={sendBroadcastMutation.isPending || !title.trim() || !body.trim()}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {sendBroadcastMutation.isPending ? 'Enviando...' : 'Enviar a Todos los Usuarios'}
          </Button>
        </CardContent>
      </Card>

      {/* Predefined Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-green-600" />
            Mensajes Predefinidos
          </CardTitle>
          <CardDescription>
            Usa estos mensajes como plantilla o inspírate para crear los tuyos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predefinedMessages.map((message, index) => (
              <Card key={index} className="border border-gray-200 hover:border-primary transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">{message.title}</h4>
                    <p className="text-xs text-muted-foreground">{message.body}</p>
                    <div className="text-xs text-blue-600">→ {message.url}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUsePredefined(message)}
                    className="w-full mt-3"
                  >
                    Usar Este Mensaje
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-800">Información sobre Notificaciones Masivas</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Solo se enviarán a usuarios que han activado las notificaciones</li>
                <li>• Las notificaciones aparecerán inmediatamente en sus dispositivos</li>
                <li>• Los usuarios pueden tocar la notificación para ir a la URL especificada</li>
                <li>• Usa mensajes motivadores y claros para mejor engagement</li>
                <li>• Evita enviar demasiadas notificaciones para no molestar a los usuarios</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BroadcastNotifications;
