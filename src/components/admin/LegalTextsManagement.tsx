import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, FileText, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function LegalTextsManagement() {
  const { toast } = useToast();
  
  // Estados para los textos legales
  const [bookingRules, setBookingRules] = useState(`Reglamento para la Reserva de Canchas de Pádel

1. Registro y Validación de Usuario
Para realizar una reserva, es necesario ingresar a la plataforma reservascdv.com, registrarse y esperar la validación de tus datos por parte del club. Una vez validados, podrás acceder al sistema de reservas.

2. Costo de la Reserva
• A través de la aplicación: $250.00
• Directamente en el club: $200.00

3. Uso de Canchas sin Reserva
En caso de que la cancha no esté reservada, los usuarios podrán hacer uso de ella sin costo alguno. No obstante, si en cualquier momento se presenta una persona con reserva vigente, se deberá desocupar la cancha de forma inmediata.

4. Política de Cancelaciones
No se permiten cancelaciones ni reembolsos una vez realizada la reserva.
(Este punto está sujeto a revisión si se decide permitir cancelaciones en el futuro.)

5. Límites y Condiciones de Reserva
• Cada usuario podrá tener un máximo de dos reservas activas, con al menos dos horas de diferencia entre ellas.
• Las reservas podrán realizarse con un mínimo de 20 minutos de anticipación.
• El sistema permite realizar reservas con hasta 3 días de anticipación.`);

  const [privacyPolicy, setPrivacyPolicy] = useState(`Aviso de Privacidad

1. Recopilación de Información
Recopilamos información personal necesaria para el funcionamiento del sistema de reservas, incluyendo nombre, email, teléfono y datos de pago.

2. Uso de la Información
La información recopilada se utiliza únicamente para:
• Gestionar las reservas de canchas
• Procesar pagos
• Comunicar información relevante sobre el servicio
• Validar la identidad de los usuarios

3. Protección de Datos
Implementamos medidas de seguridad para proteger la información personal de nuestros usuarios.

4. Compartir Información
No compartimos información personal con terceros, excepto cuando sea necesario para procesar pagos o cumplir con obligaciones legales.

5. Derechos del Usuario
Los usuarios tienen derecho a:
• Acceder a su información personal
• Solicitar correcciones
• Solicitar la eliminación de sus datos (sujeto a obligaciones legales)

6. Contacto
Para cualquier consulta sobre este aviso de privacidad, contactar al administrador del club.`);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (type: 'booking_rules' | 'privacy_policy') => {
    setIsSaving(true);
    
    try {
      // Aquí implementarías la lógica para guardar en la base de datos
      // Por ahora simulamos el guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Texto guardado",
        description: `El ${type === 'booking_rules' ? 'reglamento de reservas' : 'aviso de privacidad'} ha sido actualizado correctamente.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un problema al guardar los cambios.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Gestión de Textos Legales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="booking-rules" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="booking-rules" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reglas de Reserva
            </TabsTrigger>
            <TabsTrigger value="privacy-policy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Aviso de Privacidad
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="booking-rules" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="booking-rules-text">
                Reglamento de Reserva de Canchas
              </Label>
              <Textarea
                id="booking-rules-text"
                placeholder="Ingresa el reglamento de reservas..."
                value={bookingRules}
                onChange={(e) => setBookingRules(e.target.value)}
                className="min-h-[400px]"
              />
            </div>
            <Button 
              onClick={() => handleSave('booking_rules')} 
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Guardando..." : "Guardar Reglamento"}
            </Button>
          </TabsContent>
          
          <TabsContent value="privacy-policy" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="privacy-policy-text">
                Aviso de Privacidad
              </Label>
              <Textarea
                id="privacy-policy-text"
                placeholder="Ingresa el aviso de privacidad..."
                value={privacyPolicy}
                onChange={(e) => setPrivacyPolicy(e.target.value)}
                className="min-h-[400px]"
              />
            </div>
            <Button 
              onClick={() => handleSave('privacy_policy')} 
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Guardando..." : "Guardar Aviso de Privacidad"}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}