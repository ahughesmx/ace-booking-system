import { format, addHours } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Receipt, MapPin, Clock, Timer, User, CreditCard } from "lucide-react";

interface TicketReceiptProps {
  bookingData: {
    courtName: string;
    courtType: string;
    date: Date;
    time: string;
    duration: number;
    amount: number;
    paymentMethod: string;
    userName: string;
    operatorName: string;
    receiptNumber: string;
  };
  onClose: () => void;
  onPrint?: () => void;
}

export function TicketReceipt({ bookingData, onClose, onPrint }: TicketReceiptProps) {
  const {
    courtName,
    courtType,
    date,
    time,
    duration,
    amount,
    paymentMethod,
    userName,
    operatorName,
    receiptNumber
  } = bookingData;

  const startTime = new Date(date);
  const [hours, minutes] = time.split(':').map(Number);
  startTime.setHours(hours, minutes, 0, 0);
  const endTime = addHours(startTime, duration);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Receipt className="h-5 w-5" />
          Ticket de Cobro
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          #{receiptNumber}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Información del usuario */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Cliente:</span>
            <span>{userName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Atendido por:</span>
            <span>{operatorName}</span>
          </div>
        </div>

        <Separator />

        {/* Detalles de la reserva */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{courtName}</span>
            <Badge variant="secondary" className="capitalize">
              {courtType}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{format(date, "EEEE, d 'de' MMMM", { locale: es })}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
            </span>
            <Badge variant="outline">{duration} hora{duration > 1 ? 's' : ''}</Badge>
          </div>
        </div>

        <Separator />

        {/* Detalles del pago */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Precio por hora:</span>
            <span>${(amount / duration).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Duración:</span>
            <span>{duration} hora{duration > 1 ? 's' : ''}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-lg">
            <span>Total Pagado:</span>
            <span>${amount.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span>Método de pago:</span>
            <Badge variant="outline" className="capitalize">
              {paymentMethod}
            </Badge>
          </div>
        </div>

        <Separator />

        <div className="text-center text-xs text-muted-foreground">
          Gracias por su preferencia
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cerrar
          </Button>
          {onPrint && (
            <Button
              variant="default"
              className="flex-1"
              onClick={onPrint}
            >
              Imprimir
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}