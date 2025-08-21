import { format, addHours } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, MapPin, CreditCard, Timer, Loader2, AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCourtTypeSettings } from "@/hooks/use-court-type-settings";
import { useEnabledPaymentGateways } from "@/hooks/use-payment-settings";
import { BookingRulesModal } from "./BookingRulesModal";

interface BookingSummaryProps {
  date: Date;
  time: string;
  courtType: string;
  courtName: string;
  onConfirm: (paymentGateway: string) => Promise<any>;
  onCancel: () => void;
  isLoading?: boolean;
  isOperator?: boolean;
  selectedUserName?: string;
  processingPayment?: string | null;
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
  selectedUserName,
  processingPayment
}: BookingSummaryProps) {
  const { data: courtSettings } = useCourtTypeSettings(courtType);
  const { data: allPaymentGateways = [], isLoading: isLoadingGateways } = useEnabledPaymentGateways();
  
  console.log('🔍 BookingSummary DEBUG:', {
    isOperator,
    allPaymentGateways,
    isLoadingGateways,
    gatewaysLength: allPaymentGateways.length,
    processingPayment
  });
  
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

  // Simplified payment gateways logic
  const paymentGateways = isOperator 
    ? [
        // Solo efectivo para operadores
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
    : allPaymentGateways.filter(gateway => gateway.enabled && gateway.name !== 'efectivo');
  
  console.log('🎯 Final paymentGateways:', paymentGateways);

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

        {/* Warning sobre política de reembolsos */}
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Las reservaciones realizadas no son reembolsables por cancelación o falta de uso.
          </AlertDescription>
        </Alert>

        {/* Aviso sobre reglas de reserva */}
        <BookingRulesModal>
          <Button variant="link" className="p-0 h-auto text-sm text-primary hover:underline justify-start text-left whitespace-normal">
            <Info className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
            <span>Aviso: Antes de realizar un pago asegúrate de leer las reglas de reserva.</span>
          </Button>
        </BookingRulesModal>

        {/* Métodos de pago */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Métodos de Pago
          </h4>
          
          {isLoadingGateways ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Cargando métodos de pago...</span>
            </div>
          ) : paymentGateways.length === 0 ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> No hay métodos de pago configurados. Por favor contacte al administrador.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {paymentGateways.map((gateway) => {
                const isProcessing = processingPayment === gateway.name;
                const isDisabled = isLoading || !!processingPayment;
                
                return (
                  <Button
                    key={gateway.id}
                    variant="outline"
                    className="w-full justify-start"
                    disabled={isDisabled}
                    onClick={() => {
                      console.log(`🎯 CLICKED: Payment button for ${gateway.name}`);
                      onConfirm(gateway.name);
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          {gateway.name === 'stripe' && (
                            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                              $
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
                        </>
                      )}
                      <span className="capitalize flex-1 text-left">
                        {isProcessing ? (
                          gateway.name === 'efectivo' ? 'Procesando pago en efectivo...' : 'Procesando...'
                        ) : (
                          gateway.name === 'stripe' ? 'Pagar con tarjeta' : gateway.name
                        )}
                      </span>
                      {gateway.test_mode && !isProcessing && (
                        <Badge variant="secondary" className="text-xs">
                          Test
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
            Cancelar
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