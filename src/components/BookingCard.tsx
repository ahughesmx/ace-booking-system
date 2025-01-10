import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { Booking } from "@/types/booking";
import { isAfter, subHours } from "date-fns";

type BookingCardProps = {
  booking: Booking;
  isOwner: boolean;
  onCancel: (id: string) => void;
};

export function BookingCard({ booking, isOwner, onCancel }: BookingCardProps) {
  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const isActive = () => {
    const endTime = new Date(booking.end_time);
    const twoHoursAgo = subHours(new Date(), 2);
    return isAfter(endTime, twoHoursAgo);
  };

  const active = isActive();

  // Agregar console.logs detallados para debugging
  console.log('Booking data:', {
    bookingId: booking.id,
    userId: booking.user_id,
    userData: booking.user,
    memberId: booking.user?.member_id,
    fullUserObject: booking
  });

  return (
    <Card className={`border-[#6898FE]/20 bg-gradient-to-br from-white to-[#6898FE]/5 hover:shadow-lg transition-all duration-300 ${!active ? 'opacity-50' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium bg-clip-text text-transparent bg-gradient-to-r from-[#6898FE] to-[#0FA0CE]">
                {booking.court?.name || "Cancha sin nombre"}
              </p>
              {!active && (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600">
                  Finalizada
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
            </p>
            <div className="text-sm text-muted-foreground">
              <p>Reservado por: {booking.user?.full_name || "Usuario desconocido"}</p>
              {booking.user?.member_id && booking.user.member_id.trim() !== "" ? (
                <p className="text-xs">Clave de socio: {booking.user.member_id}</p>
              ) : (
                <p className="text-xs">invitado</p>
              )}
            </div>
          </div>
          {isOwner && active && (
            <Button
              variant="destructive"
              size="icon"
              onClick={() => onCancel(booking.id)}
              className="hover:bg-red-600 transition-colors duration-200"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}