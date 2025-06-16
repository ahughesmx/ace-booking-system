
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { format, addDays, startOfToday, isAfter, isBefore } from "date-fns";
import type { Booking } from "@/types/booking";
import { EmptyBookingsList } from "./booking/EmptyBookingsList";
import { BookingsListContent } from "./booking/BookingsListContent";

interface BookingsListProps {
  bookings: Booking[];
  onCancelSuccess: () => void;
  selectedDate?: Date;
}

const BUSINESS_HOURS = {
  start: 8,
  end: 22,
};

export function BookingsList({ bookings, onCancelSuccess, selectedDate }: BookingsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: userRole } = useUserRole(user?.id);
  const isAdmin = userRole?.role === "admin";
  const queryClient = useQueryClient();

  // Obtener las reglas de reserva para validar fechas
  const { data: bookingRules } = useQuery({
    queryKey: ["bookingRules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_rules")
        .select("*")
        .single();

      if (error) throw error;
      return data;
    }
  });

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

      const bookingDate = new Date(booking.start_time);
      await queryClient.invalidateQueries({ 
        queryKey: ["bookings", bookingDate, booking.court_id]
      });

      onCancelSuccess();
    } catch (error) {
      console.error("Error canceling booking:", error);
      toast({
        title: "Error",
        description: "No se pudo cancelar la reserva. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  // Validar que la fecha seleccionada esté dentro del rango permitido por las reglas administrativas
  const isValidDate = (date?: Date) => {
    if (!date || !bookingRules) return false;
    
    const today = startOfToday();
    const maxDate = addDays(today, bookingRules.max_days_ahead);
    
    return date >= today && date <= maxDate;
  };

  // Si la fecha no es válida según las reglas administrativas, mostrar mensaje apropiado
  if (!isValidDate(selectedDate)) {
    return (
      <EmptyBookingsList
        isAuthenticated={false}
        bookedSlots={new Set()}
        businessHours={BUSINESS_HOURS}
        selectedDate={selectedDate}
      />
    );
  }

  if (!user) {
    const bookedSlots = new Set(
      bookings.map(booking => format(new Date(booking.start_time), "HH:00"))
    );

    return (
      <EmptyBookingsList
        isAuthenticated={false}
        bookedSlots={bookedSlots}
        businessHours={BUSINESS_HOURS}
        selectedDate={selectedDate}
      />
    );
  }

  if (!bookings.length) {
    return (
      <EmptyBookingsList
        isAuthenticated={true}
        bookedSlots={new Set()}
        businessHours={BUSINESS_HOURS}
        selectedDate={selectedDate}
      />
    );
  }

  return (
    <BookingsListContent
      bookings={bookings}
      isAdmin={isAdmin}
      userId={user.id}
      onCancel={handleCancelBooking}
    />
  );
}
