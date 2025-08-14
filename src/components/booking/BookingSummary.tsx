import { format, addHours } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, MapPin, CreditCard, Timer } from "lucide-react";
import { useCourtTypeSettings } from "@/hooks/use-court-type-settings";
import { useEnabledPaymentGateways } from "@/hooks/use-payment-settings";

interface BookingSummaryProps {
  date: Date;
  time: string;
  courtType: string;
  courtName: string;
  onConfirm: (paymentGateway: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isOperator?: boolean;
  selectedUserName?: string;
}

export function BookingSummary({
  date,
  time,
  courtType,
  courtName,
  onConfirm,
  onCancel,
  isLoading = false,
  isOperator = false,
  selectedUserName
}: BookingSummaryProps) {
  const { data: courtSettings } = useCourtTypeSettings(courtType);
  const { data: allPaymentGateways = [] } = useEnabledPaymentGateways();
  
  // Usar precio de operador si es una reserva hecha por operador
  const normalPrice = Array.isArray(courtSettings) 
    ? courtSettings[0]?.price_per_hour || 0 
    : courtSettings?.price_per_hour || 0;
  const operatorPrice = Array.isArray(courtSettings)
    ? courtSettings[0]?.operador_price_per_hour || 0
    : courtSettings?.operador_price_per_hour || 0;
  
  const pricePerHour = isOperator && operatorPrice > 0 ? operatorPrice : normalPrice;
  const duration = 1; // 1 hora por defecto
  const total = pricePerHour * duration;

  // Filtrar métodos de pago según el rol
  const paymentGateways = isOperator 
    ? [
        ...allPaymentGateways,
        // Agregar efectivo solo para operadores
        {
          id: 'efectivo',
          name: 'efectivo',
          enabled: true,
          test_mode: false,
          configuration: {},
          created_at: '',
          updated_at: ''
        }
      ]
    : allPaymentGateways.filter(gateway => gateway.name !== 'efectivo');

  const startTime = new Date(date);
  const [hours, minutes] = time.split(':').map(Number);
  startTime.setHours(hours, minutes, 0, 0);
  const endTime = addHours(startTime, duration);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Resumen de Reserva
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Usuario seleccionado (solo para operadores) */}
        {isOperator && selectedUserName && (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1">
                👤 Reserva para: {selectedUserName}
              </Badge>
            </div>
            <Separator />
          </>
        )}

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
            <Badge variant="outline">1 hora</Badge>
          </div>
        </div>

        <Separator />

        {/* Detalles del precio */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Precio por hora{isOperator ? ' (Operador)' : ''}:</span>
            <span>${pricePerHour}</span>
          </div>
          <div className="flex justify-between">
            <span>Duración:</span>
            <span>{duration} hora{duration > 1 ? 's' : ''}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-lg">
            <span>Total:</span>
            <span>${total}</span>
          </div>
        </div>

        <Separator />

        {/* Métodos de pago */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Métodos de Pago
          </h4>
          
          {paymentGateways.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay métodos de pago configurados
            </p>
          ) : (
            <div className="space-y-2">
              {paymentGateways.map((gateway) => {
                // Solo efectivo está habilitado para operadores
                const isDisabledForOperator = isOperator && gateway.name !== 'efectivo';
                
                return (
                  <Button
                    key={gateway.id}
                    variant="outline"
                    className={`w-full justify-start ${
                      isDisabledForOperator 
                        ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                        : ''
                    }`}
                    disabled={isLoading || isDisabledForOperator}
                    onClick={() => {
                      if (!isDisabledForOperator) {
                        console.log(`🔄 Payment button clicked for ${gateway.name}`, { isLoading, gateway });
                        onConfirm(gateway.name);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {gateway.name === 'stripe' && (
                        <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                          S
                        </div>
                      )}
                      {gateway.name === 'paypal' && (
                        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">
                          PP
                        </div>
                      )}
                      {gateway.name === 'efectivo' && (
                        <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center text-white text-xs font-bold">
                          💵
                        </div>
                      )}
                      <span className="capitalize">{gateway.name}</span>
                      {gateway.test_mode && (
                        <Badge variant="secondary" className="text-xs">
                          Test
                        </Badge>
                      )}
                      {isDisabledForOperator && (
                        <Badge variant="destructive" className="text-xs ml-auto">
                          No disponible para operadores
                        </Badge>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isLoading}
          >
            Salir
          </Button>
          {paymentGateways.length === 0 && (
            <Button
              className="flex-1"
              disabled={true}
            >
              No hay métodos de pago
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}