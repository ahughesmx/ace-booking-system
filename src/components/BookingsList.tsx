import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/AuthProvider";
import { BookingCard } from "@/components/BookingCard";
import { TimeSlotsGrid } from "@/components/TimeSlotsGrid";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { useQueryClient } from "@tanstack/react-query";
import { useCourts } from "@/hooks/use-courts";
import type { Booking } from "@/types/booking";
import { format, addDays, startOfToday, isAfter, isBefore, endOfTomorrow } from "date-fns";

interface BookingsListProps {
  bookings: Booking[];
  onCancelSuccess: () => void;
  selectedDate?: Date;
}

const BUSINESS_HOURS = {
  start: 8, // 8 AM
  end: 22, // 10 PM (último slot será de 22:00 a 23:00)
};

export function BookingsList({ bookings, onCancelSuccess, selectedDate }: BookingsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: userRole } = useUserRole(user?.id);
  const { data: courts = [] } = useCourts();
  const isAdmin = userRole?.role === "admin";
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

  // Validar que la fecha seleccionada sea hoy o mañana
  const isValidDate = (date?: Date) => {
    if (!date) return false;
    const today = startOfToday();
    const tomorrow = endOfTomorrow();
    return !isBefore(date, today) && !isAfter(date, tomorrow);
  };

  if (!isValidDate(selectedDate)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1e3a8a]">Horarios disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Solo se pueden hacer reservas para hoy y mañana
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    const bookedSlots = new Set(
      bookings.map(booking => format(new Date(booking.start_time), "HH:00"))
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1e3a8a]">Horarios disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <TimeSlotsGrid 
            bookedSlots={bookedSlots}
            businessHours={BUSINESS_HOURS}
            selectedDate={selectedDate}
          />
        </CardContent>
      </Card>
    );
  }

  if (!bookings.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1e3a8a]">Reservas del día</CardTitle>
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
        <CardTitle className="text-[#1e3a8a]">Reservas del día</CardTitle>
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