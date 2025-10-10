
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, User, Calendar, Trophy, GraduationCap, Star, Zap, CalendarClock, AlertTriangle } from "lucide-react";
import type { Booking } from "@/types/booking";
import { useCancellationRules } from "@/hooks/use-cancellation-rules";
import { useReschedulingRules } from "@/hooks/use-rescheduling-rules";
import { RescheduleBookingModal } from "@/components/booking/RescheduleBookingModal";
import { useState } from "react";
import { useIsBookingAffected } from "@/hooks/use-affected-bookings";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BookingCardProps {
  booking: Booking & { isSpecial?: boolean; event_type?: string; title?: string; description?: string };
  isOwner: boolean;
  onCancel: (id: string) => void;
}

export function BookingCard({ booking, isOwner, onCancel }: BookingCardProps) {
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const { getCancellationAllowed } = useCancellationRules();
  const { canReschedule } = useReschedulingRules();
  const { data: affectedBooking } = useIsBookingAffected(booking.id);

  const isCancellationAllowed = getCancellationAllowed(booking.court?.court_type);
  const isReschedulingAllowed = canReschedule(booking.start_time, booking.court?.court_type);
  const isAffectedByEmergency = !!affectedBooking && !affectedBooking.rescheduled;
  
  // Permitir reagendar si las reglas lo permiten o si está afectada por cierre/mantenimiento
  const canShowReschedule = isReschedulingAllowed || isAffectedByEmergency;

  const getEventIcon = (eventType?: string) => {
    switch (eventType) {
      case 'torneo':
        return <Trophy className="w-4 h-4" />;
      case 'clases':
        return <GraduationCap className="w-4 h-4" />;
      case 'eventos':
        return <Star className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getEventColor = (eventType?: string) => {
    switch (eventType) {
      case 'torneo':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'clases':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'eventos':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <Card className={`w-full ${isAffectedByEmergency ? 'border-red-300 border-2' : ''}`}>
      <CardContent className="p-4">
        {/* Alerta de cierre imprevisto */}
        {isAffectedByEmergency && (
          <Alert className="mb-3 bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-sm text-red-800">
              <strong>¡Cierre Imprevisto!</strong> Esta reserva se ve afectada por un cierre imprevisto o mantenimiento programado. 
              {affectedBooking?.maintenance?.reason && ` Motivo: ${affectedBooking.maintenance.reason}.`}
              {' '}Puede reagendarla libremente respetando horarios de operación y disponibilidad.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Header con nombre y badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          {booking.isSpecial ? (
            <>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getEventIcon(booking.event_type)}
                <h3 className="font-semibold text-lg">{booking.title || 'Evento Especial'}</h3>
              </div>
              <Badge className={`${getEventColor(booking.event_type)} flex-shrink-0`}>
                {booking.event_type?.charAt(0).toUpperCase() + booking.event_type?.slice(1) || 'Evento'}
              </Badge>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <h3 className="font-semibold text-lg">
                  {booking.user?.full_name || "Reserva Regular"}
                </h3>
              </div>
              <Badge variant="outline" className="flex-shrink-0">Reserva Regular</Badge>
            </>
          )}
        </div>

        {/* Información de la reserva */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>
              {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{booking.court?.name}</span>
            <Badge variant="secondary" className="text-xs">
              {booking.court?.court_type === 'tennis' ? 'Tenis' : 'Pádel'}
            </Badge>
          </div>

          {booking.isSpecial && booking.description && (
            <p className="text-sm text-gray-600">{booking.description}</p>
          )}

          {!booking.isSpecial && booking.user?.member_id && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <User className="w-3 h-3" />
              <span>Socio: {booking.user.member_id}</span>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        {isOwner && !booking.isSpecial && (
          <div className="flex gap-2 justify-end">
            {canShowReschedule && (
              <Button
                variant={isAffectedByEmergency ? "default" : "outline"}
                size="sm"
                onClick={() => setIsRescheduleModalOpen(true)}
                className={isAffectedByEmergency ? "bg-yellow-600 hover:bg-yellow-700" : "text-blue-600 border-blue-200 hover:bg-blue-50"}
              >
                <CalendarClock className="w-4 h-4 mr-1" />
                {isAffectedByEmergency ? "Reagendar Ahora" : "Reagendar"}
              </Button>
            )}
            
            {isCancellationAllowed && !isAffectedByEmergency && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(booking.id)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Cancelar
              </Button>
            )}
            
            {!isCancellationAllowed && !canShowReschedule && (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                <Zap className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </div>
        )}
      </CardContent>

      {isRescheduleModalOpen && (
        <RescheduleBookingModal
          isOpen={isRescheduleModalOpen}
          onClose={() => setIsRescheduleModalOpen(false)}
          booking={booking}
        />
      )}
    </Card>
  );
}
