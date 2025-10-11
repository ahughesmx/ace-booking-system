
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { useCancellationRules } from "@/hooks/use-cancellation-rules";
import { useBookingRules } from "@/hooks/use-booking-rules";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Booking } from "@/types/booking";
import { EmptyBookingsList } from "./booking/EmptyBookingsList";
import { BookingsListContent } from "./booking/BookingsListContent";
import { useAllBookings } from "@/hooks/use-bookings";
import { useQuery } from "@tanstack/react-query";

interface BookingsListProps {
  bookings: Booking[];
  onCancelSuccess: () => void;
  selectedDate?: Date;
}

export function BookingsList({ bookings, onCancelSuccess, selectedDate }: BookingsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: userRole } = useUserRole(user?.id);
  const isAdmin = userRole?.role === "admin";
  const isOperator = userRole?.role === "operador";
  const { getCancellationAllowed } = useCancellationRules();
  const { data: tennisRules } = useBookingRules('tennis');
  const { data: padelRules } = useBookingRules('padel');
  const queryClient = useQueryClient();

  const { data: allBookings = [], isLoading } = useAllBookings(selectedDate);
  
  // Obtener configuraciones reales de horarios desde la BD
  const { data: courtTypeSettings } = useQuery({
    queryKey: ["court-type-settings-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("court_type_settings")
        .select("*");
      if (error) throw error;
      return data;
    },
  });
  
  // Calcular el rango de horarios real basado en todas las configuraciones
  const businessHours = {
    start: courtTypeSettings?.reduce((min, setting) => {
      const hour = parseInt(setting.operating_hours_start.split(':')[0]);
      return hour < min ? hour : min;
    }, 8) || 8,
    end: courtTypeSettings?.reduce((max, setting) => {
      const hour = parseInt(setting.operating_hours_end.split(':')[0]);
      return hour > max ? hour : max;
    }, 22) || 22,
  };

  console.log("BookingsList received props:", { 
    bookingsCount: bookings.length, 
    selectedDate,
    selectedDateType: typeof selectedDate,
    selectedDateInstanceOfDate: selectedDate instanceof Date,
    selectedDateValid: selectedDate ? !isNaN(selectedDate.getTime()) : false,
    user: !!user,
    allBookings: allBookings.length 
  });

  // Filtrar reservas para mostrar solo las futuras o actuales
  const now = new Date();
  const activeBookings = allBookings.filter(booking => {
    const endTime = new Date(booking.end_time);
    return endTime > now; // Solo mostrar reservas que no han terminado
  });

  console.log("Filtered active bookings:", {
    total: allBookings.length,
    active: activeBookings.length,
    currentTime: now.toISOString()
  });

  const handleCancelBooking = async (bookingId: string) => {
    try {
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

        // Get the appropriate booking rules for this court type
        const currentRules = booking.court?.court_type === 'tennis' ? tennisRules : padelRules;

        // Verificar si la cancelación está permitida para este tipo de cancha
        const isCancellationAllowed = getCancellationAllowed(booking.court?.court_type);
        if (!isAdmin && !isCancellationAllowed) {
          toast({
            title: "Cancelación no permitida",
            description: `Las cancelaciones están deshabilitadas para canchas de ${booking.court?.court_type === 'tennis' ? 'tenis' : 'pádel'}.`,
            variant: "destructive",
          });
          return;
        }

      const startTime = new Date(booking.start_time);
      const now = new Date();
      
      // Calculate hours difference more precisely
      const timeDifference = startTime.getTime() - now.getTime();
      const hoursDifference = timeDifference / (1000 * 60 * 60);

      // Get minimum cancellation time from rules (convert from interval string to hours)
      let minCancellationHours = 24; // Default fallback
      if (currentRules?.min_cancellation_time) {
        const timeParts = currentRules.min_cancellation_time.split(':');
        minCancellationHours = parseInt(timeParts[0]) + (parseInt(timeParts[1]) / 60);
      }

      console.log('🕒 Cancellation time check:', {
        startTime: startTime.toISOString(),
        now: now.toISOString(),
        timeDifference,
        hoursDifference,
        minCancellationHours,
        currentRules: currentRules?.min_cancellation_time,
        courtType: booking.court?.court_type,
        isAdmin
      });

      // Check minimum cancellation time for non-admin users
      if (!isAdmin && hoursDifference < minCancellationHours) {
        toast({
          title: "No se puede cancelar",
          description: `Las reservas solo pueden cancelarse con al menos ${minCancellationHours} horas de anticipación. Faltan ${Math.round(hoursDifference * 10) / 10} horas.`,
          variant: "destructive",
        });
        return;
      }

        const { error } = await supabase
          .from("bookings")
          .update({ status: "cancelled" })
          .eq("id", bookingId);

        if (error) throw error;

        // Trigger booking_cancelled webhooks
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user?.id)
            .single();

          const { data: court } = await supabase
            .from("courts")
            .select("*")
            .eq("id", booking.court.id)
            .single();

          const webhookData = {
            booking_id: bookingId,
            user_id: user?.id,
            court_id: booking.court.id,
            start_time: booking.start_time,
            end_time: booking.end_time,
            court_name: booking.court.name,
            court_type: booking.court.court_type,
            user_name: profile?.full_name,
            user_phone: profile?.phone,
            remotejid: profile?.phone,
            date: new Date(booking.start_time).toISOString().split('T')[0],
            time: new Date(booking.start_time).toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: false,
              timeZone: 'America/Mexico_City'
            }),
            cancellation_reason: 'User cancelled'
          };

          // Get active webhooks for booking_cancelled
          const { data: webhooks } = await supabase
            .from("webhooks")
            .select("*")
            .eq("event_type", "booking_cancelled")
            .eq("is_active", true);

          if (webhooks && webhooks.length > 0) {
            console.log(`🚀 Disparando ${webhooks.length} webhooks para booking_cancelled`);
            for (const webhook of webhooks) {
              try {
                const customHeaders = webhook.headers as Record<string, string> || {};
                const headers: Record<string, string> = {
                  "Content-Type": "application/json",
                  ...customHeaders,
                };

                await fetch(webhook.url, {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    event: "booking_cancelled",
                    timestamp: new Date().toISOString(),
                    data: webhookData,
                    webhook_name: webhook.name
                  }),
                });

                console.log(`✅ Webhook ${webhook.name} disparado exitosamente para booking_cancelled`);
              } catch (webhookError) {
                console.error(`❌ Error disparando webhook ${webhook.name}:`, webhookError);
              }
            }
          }
        } catch (webhookError) {
          console.error("❌ Error procesando webhooks de cancelación:", webhookError);
        }
      }

      // Invalidate all booking-related queries
      await queryClient.invalidateQueries({ 
        queryKey: ["bookings"] 
      });
      
      await queryClient.invalidateQueries({ 
        queryKey: ["special-bookings"] 
      });
      
      await queryClient.invalidateQueries({ 
        queryKey: ["all-bookings-including-pending"] 
      });
      
      await queryClient.invalidateQueries({ 
        queryKey: ["userActiveBookings", user?.id] 
      });

      await queryClient.invalidateQueries({ 
        queryKey: ["active-bookings-count", user?.id] 
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

  const isValidDateForDisplay = (date?: Date) => {
    return date && date instanceof Date && !isNaN(date.getTime());
  };

  if (!isValidDateForDisplay(selectedDate)) {
    console.log("Invalid selectedDate - not a valid Date object");
    return (
      <EmptyBookingsList
        isAuthenticated={!!user}
        bookedSlots={new Set()}
        businessHours={businessHours}
        selectedDate={selectedDate}
      />
    );
  }

  console.log("Valid selectedDate detected, proceeding with bookings display");

  if (!user) {
    const bookedSlots = new Set(
      activeBookings.map(booking => format(new Date(booking.start_time), "HH:00"))
    );

    return (
      <EmptyBookingsList
        isAuthenticated={false}
        bookedSlots={bookedSlots}
        businessHours={businessHours}
        selectedDate={selectedDate}
      />
    );
  }

  if (!activeBookings.length) {
    console.log("No active bookings found for selected date, showing empty state");
    return (
      <EmptyBookingsList
        isAuthenticated={true}
        bookedSlots={new Set()}
        businessHours={businessHours}
        selectedDate={selectedDate}
      />
    );
  }

  console.log("Showing bookings list with", activeBookings.length, "active bookings");
  return (
    <BookingsListContent
      bookings={activeBookings}
      isAdmin={isAdmin}
      isOperator={isOperator}
      userId={user.id}
      onCancel={handleCancelBooking}
    />
  );
}
