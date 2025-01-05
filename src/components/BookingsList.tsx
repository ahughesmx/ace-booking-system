import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/AuthProvider";
import { BookingCard } from "@/components/BookingCard";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { useQueryClient } from "@tanstack/react-query";
import { useCourts } from "@/hooks/use-courts";
import type { Booking } from "@/types/booking";
import { format, addHours } from "date-fns";
import { es } from "date-fns/locale";

interface BookingsListProps {
  bookings: Booking[];
  onCancelSuccess: () => void;
}

const BUSINESS_HOURS = {
  start: 8, // 8 AM
  end: 23, // 11 PM (para incluir el slot de 22:00)
};

const TIME_SLOT_DURATION = 60; // 60 minutes

function generateTimeSlots() {
  const slots = [];
  for (let hour = BUSINESS_HOURS.start; hour <= BUSINESS_HOURS.end - 1; hour++) {
    const startTime = new Date(`2000-01-01T${hour.toString().padStart(2, '0')}:00`);
    const endTime = addHours(startTime, 1);
    slots.push({
      start: format(startTime, 'HH:mm'),
      end: format(endTime, 'HH:mm')
    });
  }
  return slots;
}

export function BookingsList({ bookings, onCancelSuccess }: BookingsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: userRole } = useUserRole(user?.id);
  const { data: courts = [] } = useCourts();
  const isAdmin = userRole?.role === 'admin';
  const queryClient = useQueryClient();

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return;

      const startTime = new Date(booking.start_time);
      const now = new Date();
      const hoursDifference = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (!isAdmin && hoursDifference < 24) {
        toast({
          title: "No se puede cancelar",
          description: "Las reservas solo pueden cancelarse con al menos 24 horas de anticipación.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);

      if (error) throw error;

      // Refetch the bookings query to update available time slots
      const bookingDate = new Date(booking.start_time);
      await queryClient.invalidateQueries({ 
        queryKey: ["bookings", bookingDate, booking.court_id]
      });

      onCancelSuccess();
      toast({
        title: "Reserva cancelada",
        description: "La reserva ha sido cancelada exitosamente.",
      });
    } catch (error) {
      console.error("Error canceling booking:", error);
      toast({
        title: "Error",
        description: "No se pudo cancelar la reserva. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    // Show available time slots for non-logged in users
    const timeSlots = generateTimeSlots();
    const bookedSlots = new Set(
      bookings.map(booking => format(new Date(booking.start_time), 'HH:mm'))
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle>Horarios disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {timeSlots.map(timeSlot => {
              const isAvailable = !bookedSlots.has(timeSlot.start);
              return (
                <div
                  key={timeSlot.start}
                  className={`p-3 rounded-lg border transition-colors ${
                    isAvailable 
                      ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <p className="font-medium text-sm">
                    {timeSlot.start} - {timeSlot.end}
                  </p>
                  <p className={`text-sm ${isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
                    {isAvailable ? 'Disponible' : 'No disponible'}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bookings.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reservas del día</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No hay reservas para este día
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservas del día</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bookings.map((booking: Booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              isOwner={isAdmin || user?.id === booking.user_id}
              onCancel={handleCancelBooking}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}