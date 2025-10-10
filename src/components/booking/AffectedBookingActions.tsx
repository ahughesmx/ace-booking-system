import { Button } from "@/components/ui/button";
import { Calendar, Receipt } from "lucide-react";
import { useIsBookingAffected } from "@/hooks/use-affected-bookings";
import type { Booking } from "@/types/booking";

interface AffectedBookingActionsProps {
  booking: Booking;
  onReschedule: (booking: Booking) => void;
  onReprintTicket: (booking: Booking) => void;
  onCancel?: (bookingId: string) => void;
  showCancel?: boolean;
}

export function AffectedBookingActions({ 
  booking, 
  onReschedule, 
  onReprintTicket,
  onCancel,
  showCancel = true
}: AffectedBookingActionsProps) {
  const { data: affectedBooking } = useIsBookingAffected(booking.id);
  const isAffected = !!affectedBooking && !affectedBooking.rescheduled;

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onReprintTicket(booking)}
        className="flex items-center gap-1"
      >
        <Receipt className="h-3 w-3" />
        Ticket
      </Button>
      
      {isAffected && (
        <Button
          variant="default"
          size="sm"
          onClick={() => onReschedule(booking)}
          className="flex items-center gap-1 bg-yellow-600 hover:bg-yellow-700"
        >
          <Calendar className="h-3 w-3" />
          Reagendar
        </Button>
      )}
      
      {!booking.isSpecial && showCancel && !isAffected && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCancel?.(booking.id)}
          className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
        >
          Cancelar
        </Button>
      )}
    </div>
  );
}
