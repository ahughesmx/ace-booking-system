
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Booking, RegularBooking, SpecialBooking } from "@/types/booking";
import { useEffect } from "react";

export function useBookings(selectedDate?: Date, enabled: boolean = true) {
  return useQuery({
    queryKey: ["bookings", selectedDate?.toDateString()],
    queryFn: async () => {
      if (!selectedDate) {
        console.log("🚫 No selected date provided");
        return [];
      }

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      console.log("📅 Fetching regular bookings for date:", selectedDate.toDateString(), {
        selectedDate: selectedDate.toISOString(),
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
        filterStatus: "paid",
        filterTime: "all_bookings_of_day"
      });
      
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          court:courts(id, name, court_type),
          user:profiles!user_id(full_name, member_id)
        `)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .eq("status", "paid")
        .order("start_time");

      if (error) {
        console.error("❌ Error fetching regular bookings:", error);
        return [];
      }

      console.log(`✅ Regular bookings fetched for ${selectedDate.toDateString()}:`, {
        count: data?.length || 0,
        bookings: data
      });
      return data || [];
    },
    enabled: !!selectedDate && enabled,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
}

export function useSpecialBookings(selectedDate?: Date, enabled: boolean = true) {
  return useQuery({
    queryKey: ["special-bookings", selectedDate?.toDateString()],
    queryFn: async () => {
      if (!selectedDate) {
        console.log("🚫 No selected date provided for special bookings");
        return [];
      }

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      console.log("🎯 Fetching special bookings for:", {
        selectedDate: selectedDate.toISOString(),
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString()
      });

      const { data, error } = await supabase
        .from("special_bookings")
        .select(`
          *,
          court:courts(id, name, court_type),
          reference_user:profiles!special_bookings_reference_user_id_fkey(full_name, member_id)
        `)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .order("start_time");

      if (error) {
        console.error("❌ Error fetching special bookings:", error);
        return [];
      }

      console.log("✅ Special bookings fetched:", data?.length || 0, data);
      return data || [];
    },
    enabled: !!selectedDate && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache para special bookings
    gcTime: 1000 * 60 * 15,   // 15 minutos en memoria
  });
}

export function useAllBookings(selectedDate?: Date, usePublicView: boolean = false): { data: Booking[], isLoading: boolean } {
  const queryClient = useQueryClient();
  
  // Use public view for unauthenticated access (display page)
  const { data: publicBookingsData, isLoading: loadingPublic } = useQuery({
    queryKey: ["display-bookings-combined", selectedDate?.toDateString()],
    queryFn: async () => {
      if (!selectedDate) {
        console.log("🚫 No selected date provided for public bookings");
        return [];
      }

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      console.log("🌐 Fetching public display bookings for:", {
        selectedDate: selectedDate.toISOString(),
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString()
      });
      
      const { data, error } = await supabase
        .from("display_bookings_combined")
        .select("*")
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .order("start_time");

      if (error) {
        console.error("❌ Error fetching public bookings:", error);
        return [];
      }

      console.log("✅ Public bookings fetched:", data?.length || 0, data);
      return data || [];
    },
    enabled: !!selectedDate && usePublicView,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
  
  // Use regular authenticated queries only when NOT using public view
  const { data: regularBookings = [], isLoading: loadingRegular } = useBookings(selectedDate, !usePublicView);
  const { data: specialBookings = [], isLoading: loadingSpecial } = useSpecialBookings(selectedDate, !usePublicView);

  // If using public view, transform and return
  if (usePublicView) {
    const transformedPublicBookings: Booking[] = (publicBookingsData || []).map(booking => {
      if (booking.is_special) {
        return {
          id: `special-${booking.id}`,
          court_id: booking.court_id,
          user_id: booking.user_id,
          start_time: booking.start_time,
          end_time: booking.end_time,
          created_at: booking.created_at,
          booking_made_at: booking.booking_made_at,
          payment_method: 'admin',
          actual_amount_charged: null,
          user: booking.user_full_name ? {
            full_name: booking.user_full_name,
            member_id: booking.member_id || ''
          } : null,
          court: {
            id: booking.court_id,
            name: booking.court_name || '',
            court_type: booking.court_type || ''
          },
          isSpecial: true,
          event_type: booking.event_type || '',
          title: booking.title || '',
          description: booking.description || '',
          reference_user_id: booking.user_id
        } as SpecialBooking;
      } else {
        return {
          id: booking.id,
          court_id: booking.court_id,
          user_id: booking.user_id,
          start_time: booking.start_time,
          end_time: booking.end_time,
          created_at: booking.created_at,
          booking_made_at: booking.booking_made_at,
          payment_method: 'online',
          actual_amount_charged: null,
          user: booking.user_full_name ? {
            full_name: booking.user_full_name,
            member_id: booking.member_id || ''
          } : null,
          court: {
            id: booking.court_id,
            name: booking.court_name || '',
            court_type: booking.court_type || ''
          },
          isSpecial: false
        } as RegularBooking;
      }
    });

    console.log("📊 Public bookings transformed:", {
      total: transformedPublicBookings.length,
      regular: transformedPublicBookings.filter(b => !b.isSpecial).length,
      special: transformedPublicBookings.filter(b => b.isSpecial).length
    });

    return {
      data: transformedPublicBookings,
      isLoading: loadingPublic
    };
  }

  // Setup realtime subscriptions (only for authenticated queries)
  useEffect(() => {
    if (usePublicView) return; // Skip subscriptions for public view
    
    console.log("🔄 Setting up realtime subscriptions", {
      hasSelectedDate: !!selectedDate,
      date: selectedDate?.toISOString()
    });

    // Subscribe to bookings changes
    const bookingsChannel = supabase
      .channel('bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('📡 Bookings table change detected:', payload);
          // Invalidate and refetch bookings queries
          queryClient.invalidateQueries({ queryKey: ["bookings"] });
        }
      )
      .subscribe();

    // Subscribe to special_bookings changes
    const specialBookingsChannel = supabase
      .channel('special-bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'special_bookings'
        },
        (payload) => {
          console.log('📡 Special bookings table change detected:', payload);
          // Invalidate and refetch special bookings queries
          queryClient.invalidateQueries({ queryKey: ["special-bookings"] });
        }
      )
      .subscribe();

    return () => {
      console.log("🧹 Cleaning up realtime subscriptions");
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(specialBookingsChannel);
    };
  }, [selectedDate, queryClient, usePublicView]);

  const transformedRegularBookings: RegularBooking[] = regularBookings.map(booking => ({
    id: booking.id,
    court_id: booking.court_id,
    user_id: booking.user_id,
    start_time: booking.start_time,
    end_time: booking.end_time,
    created_at: booking.created_at,
    booking_made_at: booking.booking_made_at,
    payment_method: booking.payment_method || 'online',
    actual_amount_charged: booking.actual_amount_charged,
    user: booking.user,
    court: booking.court,
    isSpecial: false
  }));

  const transformedSpecialBookings: SpecialBooking[] = specialBookings.map(booking => ({
    id: `special-${booking.id}`,
    court_id: booking.court_id,
    user_id: booking.reference_user_id,
    start_time: booking.start_time,
    end_time: booking.end_time,
    created_at: booking.created_at,
    booking_made_at: booking.created_at,
    payment_method: 'admin',
    actual_amount_charged: booking.custom_price,
    user: booking.reference_user ? {
      full_name: booking.reference_user.full_name,
      member_id: booking.reference_user.member_id
    } : null,
    court: booking.court,
    isSpecial: true,
    event_type: booking.event_type,
    title: booking.title,
    description: booking.description,
    reference_user_id: booking.reference_user_id,
  }));

  const allBookings: Booking[] = [
    ...transformedRegularBookings,
    ...transformedSpecialBookings
  ];

  console.log("📊 Combined bookings data:", {
    regular: transformedRegularBookings.length,
    special: transformedSpecialBookings.length,
    total: allBookings.length,
    date: selectedDate?.toDateString(),
    regularBookings: transformedRegularBookings,
    specialBookings: transformedSpecialBookings
  });

  return {
    data: allBookings,
    isLoading: loadingRegular || loadingSpecial
  };
}

// Updated to only count non-expired bookings
export function useCourtAvailability(courtId: string, startTime: Date, endTime: Date) {
  return useQuery({
    queryKey: ["court-availability", courtId, startTime.toISOString(), endTime.toISOString()],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from("court_maintenance")
        .select("id, start_time, end_time, reason")
        .eq("court_id", courtId)
        .eq("is_active", true)
        .gte("end_time", now) // Only active maintenance
        .or(`and(start_time.lte.${startTime.toISOString()},end_time.gt.${startTime.toISOString()}),and(start_time.lt.${endTime.toISOString()},end_time.gte.${endTime.toISOString()}),and(start_time.gte.${startTime.toISOString()},end_time.lte.${endTime.toISOString()})`);

      if (maintenanceError) throw maintenanceError;

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("id")
        .eq("court_id", courtId)
        .eq("status", "paid") // Only count paid bookings for availability
        .gte("end_time", now) // Only non-expired bookings
        .or(`and(start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()})`);

      if (bookingError) throw bookingError;

      const { data: specialBookingData, error: specialBookingError } = await supabase
        .from("special_bookings")
        .select("id")
        .eq("court_id", courtId)
        .gte("end_time", now) // Only non-expired special bookings
        .or(`and(start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()})`);

      if (specialBookingError) throw specialBookingError;

      return {
        isAvailable: !maintenanceData?.length && !bookingData?.length && !specialBookingData?.length,
        maintenanceReason: maintenanceData?.[0]?.reason,
        hasBookings: !!bookingData?.length,
        hasSpecialBookings: !!specialBookingData?.length,
        hasMaintenace: !!maintenanceData?.length
      };
    },
    enabled: !!(courtId && startTime && endTime),
  });
}

// Updated hook to get user's active bookings count (non-expired only)
export function useActiveBookingsCount(userId?: string) {
  return useQuery({
    queryKey: ["active-bookings-count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      
      try {
        const now = new Date().toISOString();
        
        const { data, error } = await supabase
          .from("bookings")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "paid") // Only count paid bookings as active
          .gte("end_time", now); // Only count non-expired bookings

        if (error) {
          console.error("Error counting active bookings:", error);
          return 0;
        }

        const count = data?.length || 0;
        
        console.log("📊 Active bookings count update:", {
          userId,
          count,
          currentTime: now
        });
        
        // Try to update the profiles table with the current count
        // But don't fail the entire query if this update fails
        try {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ active_bookings: count })
            .eq("id", userId);

          if (updateError) {
            console.warn("Warning updating active bookings count (non-critical):", updateError);
          }
        } catch (updateErr) {
          console.warn("Network error updating active bookings count (non-critical):", updateErr);
        }

        return count;
      } catch (err) {
        console.error("Critical error in useActiveBookingsCount:", err);
        return 0; // Return fallback value instead of throwing
      }
    },
    enabled: !!userId,
    staleTime: 30000, // Cache for 30 seconds to reduce network calls
    gcTime: 60000, // Cache for 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes (less aggressive)
    retry: (failureCount, error) => {
      // Don't retry network errors more than once
      if (failureCount > 1) return false;
      return true;
    },
    retryDelay: 2000, // Wait 2 seconds before retry
  });
}
