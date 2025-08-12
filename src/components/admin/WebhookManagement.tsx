
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { 
  Trash2, 
  Plus, 
  ExternalLink, 
  Webhook,
  Settings,
  TestTube,
  Copy,
  AlertCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  validateWebhookUrl, 
  validateWebhookHeaders, 
  sanitizeInput, 
  validateEventType 
} from "@/utils/validation";

interface Webhook {
  id: string;
  name: string;
  url: string;
  event_type: string;
  is_active: boolean;
  headers?: Record<string, string>;
  created_at: string;
}

const WebhookManagement = () => {
  const { isAdmin, isLoading: adminLoading } = useAdminAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: "",
    url: "",
    event_type: "booking_created",
    headers: "{}"
  });

  const getEventInfo = (eventType: string) => {
    const eventConfigs = {
      booking_created: {
        description: "Se dispara cuando se crea una nueva reserva",
        headerExample: '{"Content-Type": "application/json"}',
        headerPlaceholder: 'Opcional: Headers HTTP como autenticación',
        payloadExample: `{
  "event": "booking_created",
  "timestamp": "2025-08-15T18:30:00Z",
  "data": {
    "id": "booking-uuid",
    "courtName": "Cancha 1",
    "courtId": "court-uuid",
    "startTime": "2025-08-15T18:30:00Z",
    "endTime": "2025-08-15T20:00:00Z",
    "userName": "Juan Pérez",
    "userId": "user-uuid",
    "remotejid": "52123456789",
    "date": "2025-08-15",
    "time": "18:30"
  },
  "webhook_name": "Mi Webhook"
}`
      },
      match_created: {
        description: "Se dispara cuando se crea un nuevo partido",
        headerExample: '{"Content-Type": "application/json", "Authorization": "Bearer token"}',
        headerPlaceholder: 'Opcional: Headers para autenticación con tu sistema',
        payloadExample: `{
  "event": "match_created",
  "data": {
    "match_id": "456",
    "player1_name": "Carlos Martínez",
    "player2_name": "Ana López",
    "court_name": "Cancha 3",
    "match_time": "2025-08-15T18:30:00Z",
    "is_doubles": false
  }
}`
      },
      booking_cancelled: {
        description: "Se dispara cuando se cancela una reserva",
        headerExample: '{"Content-Type": "application/json"}',
        headerPlaceholder: 'Opcional: Headers HTTP adicionales',
        payloadExample: `{
  "event": "booking_cancelled",
  "data": {
    "booking_id": "123",
    "user_name": "Juan Pérez",
    "court_name": "Cancha 1",
    "cancelled_at": "2025-08-15T16:00:00Z"
  }
}`
      },
      match_completed: {
        description: "Se dispara cuando se completa un partido",
        headerExample: '{"Content-Type": "application/json"}',
        headerPlaceholder: 'Opcional: Headers HTTP adicionales',
        payloadExample: `{
  "event": "match_completed",
  "data": {
    "match_id": "456",
    "winner": "Carlos Martínez",
    "score": "6-4, 6-2",
    "completed_at": "2025-08-15T20:30:00Z"
  }
}`
      },
      match_invitation_sent: {
        description: "Se dispara cuando se envía una invitación de partido",
        headerExample: '{"Content-Type": "application/json"}',
        headerPlaceholder: 'Opcional: Headers para autenticación con tu sistema de mensajería',
        payloadExample: `{
  "event": "match_invitation_sent",
  "timestamp": "2025-08-15T18:30:00Z",
  "data": {
    "match_id": "match-uuid",
    "sender_name": "Juan Pérez",
    "sender_id": "sender-uuid",
    "recipient_name": "María García",
    "recipient_id": "recipient-uuid",
    "court_name": "Cancha 1",
    "match_time": "2025-08-15T20:00:00Z",
    "is_doubles": false,
    "position": "player2"
  }
}`
      },
      match_invitation_responded: {
        description: "Se dispara cuando un jugador responde a una invitación de partido",
        headerExample: '{"Content-Type": "application/json"}',
        headerPlaceholder: 'Opcional: Headers para autenticación con tu sistema de mensajería',
        payloadExample: `{
  "event": "match_invitation_responded",
  "timestamp": "2025-08-15T18:30:00Z",
  "data": {
    "match_id": "match-uuid",
    "sender_name": "Juan Pérez",
    "sender_id": "sender-uuid",
    "recipient_name": "María García",
    "recipient_id": "recipient-uuid",
    "court_name": "Cancha 1",
    "match_time": "2025-08-15T20:00:00Z",
    "response": "accepted",
    "is_doubles": false
  }
}`
      },
      user_registered: {
        description: "Se dispara cuando se registra un nuevo usuario",
        headerExample: '{"Content-Type": "application/json"}',
        headerPlaceholder: 'Opcional: Headers HTTP adicionales',
        payloadExample: `{
  "event": "user_registered",
  "data": {
    "user_id": "789",
    "user_name": "María García",
    "email": "maria@email.com",
    "registered_at": "2025-08-15T10:00:00Z"
  }
}`
      }
    };
    return eventConfigs[eventType] || eventConfigs.booking_created;
  };
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Don't render anything until admin auth is verified
  if (adminLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Verificando permisos de administrador...</div>
      </div>
    );
  }

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching webhooks:", error);
        throw error;
      }
      return data as Webhook[];
    },
  });

  const createWebhookMutation = useMutation({
    mutationFn: async (webhook: Omit<Webhook, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from("webhooks")
        .insert([webhook])
        .select()
        .single();

      if (error) {
        console.error("Error creating webhook:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setIsAddDialogOpen(false);
      setNewWebhook({ name: "", url: "", event_type: "booking_created", headers: "{}" });
      toast({
        title: "Webhook creado",
        description: "El webhook se ha configurado correctamente",
      });
    },
    onError: (error: any) => {
      console.error("Webhook creation error:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el webhook",
        variant: "destructive",
      });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("webhooks")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting webhook:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast({
        title: "Webhook eliminado",
        description: "El webhook se ha eliminado correctamente",
      });
    },
  });

  const toggleWebhookMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("webhooks")
        .update({ is_active })
        .eq("id", id);

      if (error) {
        console.error("Error toggling webhook:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast({
        title: "Webhook actualizado",
        description: "El estado del webhook se ha actualizado",
      });
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: async (webhook: Webhook) => {
      console.log('Testing webhook:', webhook.url);
      
      const testPayload = {
        event: webhook.event_type,
        timestamp: new Date().toISOString(),
        data: {
          id: `test_${Date.now()}`,
          courtName: "Cancha de Prueba",
          courtId: "test-court-id",
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
          userName: "Usuario de Prueba",
          userId: "test-user-id",
          remotejid: "52123456789",
          date: new Date().toISOString().split('T')[0],
          time: "18:00"
        }
      };

      console.log('Sending test payload:', testPayload);
      console.log('Full test payload structure:', JSON.stringify(testPayload, null, 2));
      console.log('Using headers:', {
        "Content-Type": "application/json",
        ...webhook.headers,
      });

      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...webhook.headers,
        },
        body: JSON.stringify(testPayload),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      let responseText = '';
      try {
        responseText = await response.text();
        console.log('Response body:', responseText);
      } catch (e) {
        console.log('Could not read response body:', e);
      }

      if (!response.ok) {
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          body: responseText || 'No response body',
          headers: Object.fromEntries(response.headers.entries())
        };
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}\nResponse: ${responseText || 'No response body'}`);
      }

      return { 
        response, 
        responseText,
        status: response.status 
      };
    },
    onSuccess: (result) => {
      console.log('Webhook test successful:', result);
      toast({
        title: "Webhook probado exitosamente",
        description: `Respuesta HTTP ${result.status}: ${result.responseText || 'Sin contenido'}`,
      });
    },
    onError: (error: any) => {
      console.error("Webhook test detailed error:", error);
      
      const errorMessage = error.message || 'Error desconocido';
      
      toast({
        title: "Error al probar webhook",
        description: `${errorMessage}. Verifica que la URL sea correcta y que n8n esté funcionando.`,
        variant: "destructive",
      });
    },
  });

  const handleCreateWebhook = () => {
    // Input validation
    const sanitizedName = sanitizeInput(newWebhook.name, 100);
    const sanitizedUrl = sanitizeInput(newWebhook.url, 500);

    if (!sanitizedName || !sanitizedUrl) {
      toast({
        title: "Error",
        description: "El nombre y la URL son requeridos",
        variant: "destructive",
      });
      return;
    }

    // Validate URL
    const urlError = validateWebhookUrl(sanitizedUrl);
    if (urlError) {
      toast({
        title: "Error",
        description: urlError,
        variant: "destructive",
      });
      return;
    }

    // Validate event type
    if (!validateEventType(newWebhook.event_type)) {
      toast({
        title: "Error",
        description: "Tipo de evento inválido",
        variant: "destructive",
      });
      return;
    }

    // Validate headers
    const headersValidation = validateWebhookHeaders(newWebhook.headers);
    if (!headersValidation.isValid) {
      toast({
        title: "Error",
        description: headersValidation.error,
        variant: "destructive",
      });
      return;
    }

    createWebhookMutation.mutate({
      name: sanitizedName,
      url: sanitizedUrl,
      event_type: newWebhook.event_type,
      is_active: true,
      headers: headersValidation.headers,
    });
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `https://bpjinatcgdmxqetfxjji.supabase.co/functions/v1/booking-webhook`;
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "URL copiada",
      description: "La URL del webhook se ha copiado al portapapeles",
    });
  };

  const eventTypes = [
    { value: "booking_created", label: "Reserva creada" },
    { value: "booking_cancelled", label: "Reserva cancelada" },
    { value: "match_created", label: "Partido creado" },
    { value: "match_completed", label: "Partido completado" },
    { value: "match_invitation_sent", label: "Invitación de partido enviada" },
    { value: "match_invitation_responded", label: "Invitación de partido respondida" },
    { value: "user_registered", label: "Usuario registrado" },
  ];

  if (isLoading) {
    return <div className="flex justify-center p-8">Cargando webhooks...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Webhooks e Integraciones</h2>
          <p className="text-gray-600">Gestiona las conexiones con sistemas externos</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Webhook</DialogTitle>
              <DialogDescription>
                Configura un webhook para recibir notificaciones de eventos
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre del Webhook</Label>
                <Input
                  id="name"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                  placeholder="ej: Notificaciones n8n, WhatsApp Bot, etc."
                  maxLength={100}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="event_type">Tipo de Evento</Label>
                <Select
                  value={newWebhook.event_type}
                  onValueChange={(value) => setNewWebhook({ ...newWebhook, event_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((event) => (
                      <SelectItem key={event.value} value={event.value}>
                        {event.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600 mt-1">
                  {getEventInfo(newWebhook.event_type).description}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="url">URL del Webhook (HTTPS únicamente)</Label>
                <Input
                  id="url"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  placeholder="https://hooks.zapier.com/hooks/... o https://n8n.com/webhook/..."
                  maxLength={500}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="headers">{getEventInfo(newWebhook.event_type).headerPlaceholder}</Label>
                <Textarea
                  id="headers"
                  value={newWebhook.headers}
                  onChange={(e) => setNewWebhook({ ...newWebhook, headers: e.target.value })}
                  placeholder={getEventInfo(newWebhook.event_type).headerExample}
                  rows={2}
                  maxLength={2000}
                />
                <p className="text-xs text-gray-500">
                  Solo para headers HTTP como autenticación. Deja vacío si no necesitas headers especiales.
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Datos que se enviarán automáticamente</Label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600 mb-2">
                    El sistema enviará automáticamente estos datos al webhook:
                  </p>
                  <pre className="text-xs text-gray-700 overflow-auto">
                    {getEventInfo(newWebhook.event_type).payloadExample}
                  </pre>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateWebhook} disabled={createWebhookMutation.isPending}>
                {createWebhookMutation.isPending ? "Creando..." : "Crear Webhook"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Information card for booking webhook integration */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong>URL del Webhook de Reservas:</strong> Para recibir eventos de reservas, usa esta URL en tu sistema externo
          </div>
          <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar URL
          </Button>
        </AlertDescription>
      </Alert>

      {webhooks && webhooks.length > 0 ? (
        <div className="grid gap-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center space-x-3">
                  <Webhook className="h-5 w-5 text-blue-600" />
                  <div>
                    <CardTitle className="text-lg">{webhook.name}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={webhook.is_active ? "default" : "secondary"}>
                        {webhook.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                      <Badge variant="outline">
                        {eventTypes.find(e => e.value === webhook.event_type)?.label}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testWebhookMutation.mutate(webhook)}
                    disabled={testWebhookMutation.isPending}
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    Probar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleWebhookMutation.mutate({
                      id: webhook.id,
                      is_active: !webhook.is_active
                    })}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {webhook.is_active ? "Desactivar" : "Activar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <ExternalLink className="h-4 w-4" />
                    <span className="font-mono break-all">{webhook.url}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Creado:</span> {' '}
                    {new Date(webhook.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Webhook className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay webhooks configurados
            </h3>
            <p className="text-gray-600 text-center mb-4">
              Los webhooks permiten que tu aplicación se comunique con sistemas externos
              enviando notificaciones automáticas cuando ocurren eventos importantes.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primer webhook
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WebhookManagement;
