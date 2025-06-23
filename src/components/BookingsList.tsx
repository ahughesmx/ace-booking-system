
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { format } from "date-fns";
import type { Booking } from "@/types/booking";
import { EmptyBookingsList } from "./booking/EmptyBookingsList";
import { BookingsListContent } from "./booking/BookingsListContent";
import { useAllBookings } from "@/hooks/use-bookings";

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

  // Usar el hook combinado para obtener todas las reservas
  const { data: allBookings = [], isLoading } = useAllBookings(selectedDate);

  console.log("BookingsList received props:", { 
    bookingsCount: bookings.length, 
    selectedDate,
    selectedDateType: typeof selectedDate,
    selectedDateInstanceOfDate: selectedDate instanceof Date,
    selectedDateValid: selectedDate ? !isNaN(selectedDate.getTime()) : false,
    user: !!user,
    allBookings: allBookings.length 
  });

  const handleCancelBooking = async (bookingId: string) => {
    try {
      // Verificar si es una reserva especial
      if (bookingId.startsWith('special-')) {
        const realId = bookingId.replace('special-', '');
        const { error } = await supabase
          .from("special_bookings")
          .delete()
          .eq("id", realId);

        if (error) throw error;
      } else {
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
      }

      // Invalidar todas las queries relacionadas con reservas para actualizar los contadores
      await queryClient.invalidateQueries({ 
        queryKey: ["bookings"] 
      });
      
      await queryClient.invalidateQueries({ 
        queryKey: ["special-bookings"] 
      });
      
      // Invalidar específicamente la query de reservas activas del usuario
      await queryClient.invalidateQueries({ 
        queryKey: ["userActiveBookings", user?.id] 
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

  // Simplificar la validación de fecha - solo verificar que sea una fecha válida
  const isValidDateForDisplay = (date?: Date) => {
    return date && date instanceof Date && !isNaN(date.getTime());
  };

  // Si no hay una fecha seleccionada válida, mostrar mensaje apropiado
  if (!isValidDateForDisplay(selectedDate)) {
    console.log("Invalid selectedDate - not a valid Date object");
    return (
      <EmptyBookingsList
        isAuthenticated={!!user}
        bookedSlots={new Set()}
        businessHours={BUSINESS_HOURS}
        selectedDate={selectedDate}
      />
    );
  }

  console.log("Valid selectedDate detected, proceeding with bookings display");

  // Si no hay usuario autenticado, mostrar horarios disponibles
  if (!user) {
    const bookedSlots = new Set(
      allBookings.map(booking => format(new Date(booking.start_time), "HH:00"))
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

  // Si hay usuario autenticado pero no hay reservas, mostrar mensaje de día vacío
  if (!allBookings.length) {
    console.log("No bookings found for selected date, showing empty state");
    return (
      <EmptyBookingsList
        isAuthenticated={true}
        bookedSlots={new Set()}
        businessHours={BUSINESS_HOURS}
        selectedDate={selectedDate}
      />
    );
  }

  // Mostrar las reservas del día (combinando normales y especiales)
  console.log("Showing bookings list with", allBookings.length, "bookings");
  return (
    <BookingsListContent
      bookings={allBookings}
      isAdmin={isAdmin}
      userId={user.id}
      onCancel={handleCancelBooking}
    />
  );
}
