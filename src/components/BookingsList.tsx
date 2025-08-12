
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

        const startTime = new Date(booking.start_time);
        const now = new Date();
        
        // Fixed: Calculate hours difference more precisely
        const timeDifference = startTime.getTime() - now.getTime();
        const hoursDifference = timeDifference / (1000 * 60 * 60);

        console.log('Cancellation time check:', {
          startTime: startTime.toISOString(),
          now: now.toISOString(),
          timeDifference,
          hoursDifference,
          isAdmin
        });

        // Only check 24-hour rule for non-admin users
        if (!isAdmin && hoursDifference < 24) {
          toast({
            title: "No se puede cancelar",
            description: `Las reservas solo pueden cancelarse con al menos 24 horas de anticipación. Faltan ${Math.round(hoursDifference * 10) / 10} horas.`,
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase
          .from("bookings")
          .delete()
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
        businessHours={BUSINESS_HOURS}
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
        businessHours={BUSINESS_HOURS}
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
        businessHours={BUSINESS_HOURS}
        selectedDate={selectedDate}
      />
    );
  }

  console.log("Showing bookings list with", activeBookings.length, "active bookings");
  return (
    <BookingsListContent
      bookings={activeBookings}
      isAdmin={isAdmin}
      userId={user.id}
      onCancel={handleCancelBooking}
    />
  );
}
