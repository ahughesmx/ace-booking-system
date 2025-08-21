import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info } from "lucide-react";

interface BookingRulesModalProps {
  children: React.ReactNode;
}

export function BookingRulesModal({ children }: BookingRulesModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Reglamento para la Reserva de Canchas de Pádel
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="mt-4 max-h-[60vh]">
          <div className="space-y-4 pr-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">1. Registro y Validación de Usuario</h3>
              <p className="text-muted-foreground">
                Para realizar una reserva, es necesario ingresar a la plataforma reservascdv.com, registrarse y esperar la validación de tus datos por parte del club. Una vez validados, podrás acceder al sistema de reservas.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">2. Costo de la Reserva</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>A través de la aplicación: $250.00</li>
                <li>Directamente en el club: $200.00</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">3. Uso de Canchas sin Reserva</h3>
              <p className="text-muted-foreground">
                En caso de que la cancha no esté reservada, los usuarios podrán hacer uso de ella sin costo alguno. No obstante, si en cualquier momento se presenta una persona con reserva vigente, se deberá desocupar la cancha de forma inmediata.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">4. Política de Cancelaciones</h3>
              <p className="text-muted-foreground">
                No se permiten cancelaciones ni reembolsos una vez realizada la reserva.
              </p>
              <p className="text-sm text-muted-foreground italic mt-1">
                (Este punto está sujeto a revisión si se decide permitir cancelaciones en el futuro.)
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">5. Límites y Condiciones de Reserva</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Cada usuario podrá tener un máximo de dos reservas activas, con al menos dos horas de diferencia entre ellas.</li>
                <li>Las reservas podrán realizarse con un mínimo de 20 minutos de anticipación.</li>
                <li>El sistema permite realizar reservas con hasta 3 días de anticipación.</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}