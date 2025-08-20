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
    
    // Crear estilos de impresión dinámicamente
    const printStyles = `
      <style>
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .ticket-container {
            max-width: 400px;
            margin: 0 auto;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: black !important;
            background: white !important;
          }
          .print-header {
            text-align: center;
            margin-bottom: 20px;
          }
          .print-header h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: black !important;
          }
          .print-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 8px 0;
            color: black !important;
          }
          .print-badge {
            background: #f3f4f6 !important;
            color: black !important;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }
          .print-separator {
            border-top: 1px solid #e5e7eb;
            margin: 12px 0;
          }
          .print-total {
            font-size: 18px;
            font-weight: 600;
            padding-top: 8px;
            color: black !important;
          }
          .print-thanks {
            text-align: center;
            font-size: 12px;
            margin-top: 20px;
            color: black !important;
          }
        }
        @media screen {
          .print-content {
            display: none;
          }
        }
      </style>
    `;

    // Crear el contenido para imprimir
    const printContent = `
      <div class="print-content">
        <div class="ticket-container">
          <div class="print-header">
            <h1>🧾 Ticket de Cobro</h1>
            <div style="color: #6b7280; font-size: 14px; margin: 5px 0;">
              #${receiptNumber}
            </div>
            <div style="color: #6b7280; font-size: 12px;">
              Fecha de impresión: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}
            </div>
          </div>
          
          <div style="font-size: 14px; line-height: 1.5;">
            <div class="print-row">
              <span>👤</span>
              <span style="font-weight: 500;">Cliente:</span>
              <span>${userName}</span>
            </div>

            <div style="margin: 8px 0; color: #6b7280;">
              <span>Atendido por: ${operatorName}</span>
            </div>

            <div class="print-row">
              <span>📍</span>
              <span style="font-weight: 500;">${courtName}</span>
              <span class="print-badge">${courtType}</span>
            </div>

            <div class="print-row">
              <span>🕐</span>
              <span>${format(date, "EEEE, d 'de' MMMM", { locale: es })}</span>
            </div>

            <div class="print-row">
              <span>⏰</span>
              <span>
                ${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}
              </span>
              <span class="print-badge">
                ${duration} hora${duration > 1 ? 's' : ''}
              </span>
            </div>

            <div class="print-separator"></div>

            <div style="display: flex; justify-content: space-between; margin: 6px 0;">
              <span>Precio por hora:</span>
              <span style="font-weight: 500;">$${pricePerHour.toFixed(2)}</span>
            </div>

            <div style="display: flex; justify-content: space-between; margin: 6px 0;">
              <span>Duración:</span>
              <span style="font-weight: 500;">${duration} hora${duration > 1 ? 's' : ''}</span>
            </div>

            <div class="print-total" style="display: flex; justify-content: space-between; padding-top: 8px;">
              <span>Total Pagado:</span>
              <span>$${amount.toFixed(2)}</span>
            </div>

            <div class="print-row" style="padding-top: 8px;">
              <span>💳</span>
              <span>Método de pago:</span>
              <span class="print-badge">${paymentMethod}</span>
            </div>

            <div class="print-thanks">
              Gracias por su preferencia
            </div>
          </div>
        </div>
      </div>
    `;

    // Agregar el contenido al DOM temporalmente
    const existingPrintContent = document.querySelector('.print-content');
    if (existingPrintContent) {
      existingPrintContent.remove();
    }

    const existingPrintStyles = document.querySelector('#print-styles');
    if (existingPrintStyles) {
      existingPrintStyles.remove();
    }

    // Agregar estilos
    const styleElement = document.createElement('div');
    styleElement.id = 'print-styles';
    styleElement.innerHTML = printStyles;
    document.head.appendChild(styleElement);

    // Agregar contenido
    const contentElement = document.createElement('div');
    contentElement.innerHTML = printContent;
    document.body.appendChild(contentElement);

    console.log('✅ Print content added to DOM, calling window.print()');

    // Llamar a imprimir
    window.print();

    console.log('✅ Print dialog should be showing');

    // Limpiar después de un momento
    setTimeout(() => {
      if (document.querySelector('.print-content')) {
        document.querySelector('.print-content')?.remove();
      }
      if (document.querySelector('#print-styles')) {
        document.querySelector('#print-styles')?.remove();
      }
    }, 1000);

    // Llamar al callback si existe
    if (onPrint) {
      onPrint();
    }
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
            Fecha de impresión: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}
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