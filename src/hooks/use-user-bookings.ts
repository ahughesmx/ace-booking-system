import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";
import type { Booking } from "@/types/booking";

export function useUserBookings(userId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get upcoming bookings (future bookings for the family)
  const {
    data: upcomingBookings,
    isLoading: isLoadingUpcoming,
    error: upcomingError,
  } = useQuery<Booking[]>({
    queryKey: ["userUpcomingBookings", userId],
    queryFn: async () => {
      if (!userId) return [];

      // First get the user's member_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("member_id")
        .eq("id", userId)
        .single();

      if (!profile?.member_id) return [];

      // Get all upcoming regular bookings for this member_id (family)
      const { data: regularBookings, error: regularError } = await supabase
        .from("bookings")
        .select(`
          *,
          user:profiles!user_id (
            full_name,
            member_id
          ),
          court:courts (
            id,
            name,
            court_type
          )
        `)
        .eq("status", "paid")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      if (regularError) throw regularError;

      // Get all upcoming special bookings for this member_id (family)
      const { data: specialBookings, error: specialError } = await supabase
        .from("special_bookings")
        .select(`
          *,
          court:courts (
            id,
            name,
            court_type
          )
        `)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      if (specialError) throw specialError;

      // Filter regular bookings by member_id
      const filteredRegularBookings = (regularBookings || [])
        .filter((booking) => booking.user?.member_id === profile.member_id)
        .map((booking) => ({
          ...booking,
          isSpecial: false as const,
        }));

      // Filter special bookings by reference_user_id belonging to the same family
      const { data: familyMembers } = await supabase
        .from("profiles")
        .select("id")
        .eq("member_id", profile.member_id);

      const familyUserIds = familyMembers?.map(member => member.id) || [];

      const filteredSpecialBookings = (specialBookings || [])
        .filter((booking) => booking.reference_user_id && familyUserIds.includes(booking.reference_user_id))
        .map((booking) => ({
          id: booking.id,
          court_id: booking.court_id,
          user_id: null,
          start_time: booking.start_time,
          end_time: booking.end_time,
          created_at: booking.created_at,
          booking_made_at: booking.created_at,
          payment_method: 'admin',
          actual_amount_charged: booking.custom_price || 0,
          user: null,
          court: booking.court,
          isSpecial: true as const,
          event_type: booking.event_type,
          title: booking.title,
          description: booking.description,
          reference_user_id: booking.reference_user_id,
        }));

      return [...filteredRegularBookings, ...filteredSpecialBookings].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    },
    enabled: !!userId,
  });

  // Get past bookings (past bookings for the family)
  const {
    data: pastBookings,
    isLoading: isLoadingPast,
    error: pastError,
  } = useQuery<Booking[]>({
    queryKey: ["userPastBookings", userId],
    queryFn: async () => {
      if (!userId) return [];

      // First get the user's member_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("member_id")
        .eq("id", userId)
        .single();

      if (!profile?.member_id) return [];

      // Get all past regular bookings for this member_id (family)
      const { data: regularBookings, error: regularError } = await supabase
        .from("bookings")
        .select(`
          *,
          user:profiles!user_id (
            full_name,
            member_id
          ),
          court:courts (
            id,
            name,
            court_type
          )
        `)
        .eq("status", "paid")
        .lt("end_time", new Date().toISOString())
        .order("start_time", { ascending: false });

      if (regularError) throw regularError;

      // Get all past special bookings for this member_id (family)
      const { data: specialBookings, error: specialError } = await supabase
        .from("special_bookings")
        .select(`
          *,
          court:courts (
            id,
            name,
            court_type
          )
        `)
        .lt("end_time", new Date().toISOString())
        .order("start_time", { ascending: false });

      if (specialError) throw specialError;

      // Filter regular bookings by member_id
      const filteredRegularBookings = (regularBookings || [])
        .filter((booking) => booking.user?.member_id === profile.member_id)
        .map((booking) => ({
          ...booking,
          isSpecial: false as const,
        }));

      // Filter special bookings by reference_user_id belonging to the same family
      const { data: familyMembers } = await supabase
        .from("profiles")
        .select("id")
        .eq("member_id", profile.member_id);

      const familyUserIds = familyMembers?.map(member => member.id) || [];

      const filteredSpecialBookings = (specialBookings || [])
        .filter((booking) => booking.reference_user_id && familyUserIds.includes(booking.reference_user_id))
        .map((booking) => ({
          id: booking.id,
          court_id: booking.court_id,
          user_id: null,
          start_time: booking.start_time,
          end_time: booking.end_time,
          created_at: booking.created_at,
          booking_made_at: booking.created_at,
          payment_method: 'admin',
          actual_amount_charged: booking.custom_price || 0,
          user: null,
          court: booking.court,
          isSpecial: true as const,
          event_type: booking.event_type,
          title: booking.title,
          description: booking.description,
          reference_user_id: booking.reference_user_id,
        }));

      return [...filteredRegularBookings, ...filteredSpecialBookings].sort(
        (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );
    },
    enabled: !!userId,
  });

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userUpcomingBookings", userId] });
      queryClient.invalidateQueries({ queryKey: ["userPastBookings", userId] });
      toast({
        title: "Éxito",
        description: "Reservación cancelada correctamente",
      });
    },
    onError: (error) => {
      console.error("Error cancelling booking:", error);
      toast({
        title: "Error",
        description: "No se pudo cancelar la reservación",
        variant: "destructive",
      });
    },
  });

  return {
    upcomingBookings,
    pastBookings,
    isLoadingUpcoming,
    isLoadingPast,
    upcomingError,
    pastError,
    cancelBooking: cancelMutation.mutate,
  };
}