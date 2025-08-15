import { format, addHours } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const pricePerHour = amount / duration;

  const handlePrint = () => {
    console.log('🖨️ handlePrint called - Starting print process');
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('❌ Could not open print window');
      return;
    }

    const ticketContent = document.getElementById('ticket-content');
    if (!ticketContent) {
      console.error('❌ Could not find ticket-content element');
      return;
    }

    console.log('✅ Print window opened and content found, proceeding with print');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket de Cobro</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
              color: black;
            }
            .ticket-container {
              max-width: 400px;
              margin: 0 auto;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 18px;
              font-weight: 600;
            }
            .receipt-number {
              color: #6b7280;
              font-size: 14px;
              margin: 5px 0;
            }
            .date {
              color: #6b7280;
              font-size: 12px;
            }
            .content {
              font-size: 14px;
              line-height: 1.5;
            }
            .row {
              display: flex;
              align-items: center;
              gap: 8px;
              margin: 8px 0;
            }
            .icon {
              width: 16px;
              height: 16px;
              color: #6b7280;
            }
            .badge {
              background: #dbeafe;
              color: #1e40af;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 500;
            }
            .separator {
              border-top: 1px solid #e5e7eb;
              margin: 12px 0;
            }
            .price-row {
              display: flex;
              justify-content: space-between;
              margin: 6px 0;
            }
            .total {
              font-size: 18px;
              font-weight: 600;
              padding-top: 8px;
            }
            .payment-method {
              background: #dcfce7;
              color: #166534;
            }
            .thanks {
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              margin-top: 20px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .ticket-container { border: none; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          ${ticketContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  return (
    <Card className="w-full max-w-md mx-auto print:shadow-none">
      <div id="ticket-content">
        <CardHeader className="text-center pb-3">
          <div className="flex items-center justify-center gap-2 text-lg font-semibold">
            <Receipt className="h-5 w-5" />
            Ticket de Cobro
          </div>
          <div className="text-sm text-muted-foreground">
            #{receiptNumber}
          </div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}
          </div>
        </CardHeader>
      
        <CardContent className="space-y-3 text-sm">
          {/* Cliente */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            <span className="font-medium">Cliente:</span>
            <span>{userName}</span>
          </div>

          {/* Atendido por */}
          <div className="text-gray-600">
            <span>Atendido por: {operatorName}</span>
          </div>

          {/* Ubicación */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-600" />
            <span className="font-medium">{courtName}</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium capitalize">
              {courtType}
            </span>
          </div>

          {/* Fecha */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-600" />
            <span>{format(date, "EEEE, d 'de' MMMM", { locale: es })}</span>
          </div>

          {/* Horario */}
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-gray-600" />
            <span>
              {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
            </span>
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
              {duration} hora{duration > 1 ? 's' : ''}
            </span>
          </div>

          {/* Separador visual */}
          <div className="border-t border-gray-200 my-3"></div>

          {/* Precio por hora */}
          <div className="flex justify-between">
            <span>Precio por hora:</span>
            <span className="font-medium">${pricePerHour.toFixed(2)}</span>
          </div>

          {/* Duración */}
          <div className="flex justify-between">
            <span>Duración:</span>
            <span className="font-medium">{duration} hora{duration > 1 ? 's' : ''}</span>
          </div>

          {/* Total pagado */}
          <div className="flex justify-between text-lg font-semibold pt-2">
            <span>Total Pagado:</span>
            <span>${amount.toFixed(2)}</span>
          </div>

          {/* Método de pago */}
          <div className="flex items-center gap-2 pt-2">
            <CreditCard className="h-4 w-4 text-gray-600" />
            <span>Método de pago:</span>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium capitalize">
              {paymentMethod}
            </span>
          </div>

          {/* Mensaje de agradecimiento */}
          <div className="text-center text-gray-500 text-xs pt-4">
            Gracias por su preferencia
          </div>
        </CardContent>
      </div>

      {/* Botones de acción - fuera del contenido imprimible */}
      <div className="flex gap-2 pt-4 print:hidden" style={{padding: '16px'}}>
        <Button
          variant="outline"
          className="flex-1"
          onClick={onClose}
        >
          Cerrar
        </Button>
        <Button
          variant="default"
          className="flex-1"
          onClick={handlePrint}
        >
          Imprimir
        </Button>
      </div>
    </Card>
  );
}