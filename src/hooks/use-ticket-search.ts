import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/AuthProvider";
import { useGlobalRole } from "@/hooks/use-global-role";
import type { Booking } from "@/types/booking";

interface TicketSearchFilters {
  searchTerm?: string;
  startDate?: Date;
  endDate?: Date;
  courtType?: string;
  paymentMethod?: string;
}

export function useTicketSearch(filters: TicketSearchFilters) {
  const { user } = useAuth();
  const { data: userRole } = useGlobalRole(user?.id);

  return useQuery({
    queryKey: ["ticket-search", user?.id, filters],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const isAdminOrOperator = userRole?.role === 'admin' || userRole?.role === 'operador';
      
      // Base query - incluir tanto bookings regulares como special_bookings
      let regularQuery = supabase
        .from("bookings")
        .select(`
          *,
          user:profiles!user_id(full_name, member_id),
          court:courts(id, name, court_type)
        `)
        .eq("status", "paid")
        .order("start_time", { ascending: false });

      let specialQuery = supabase
        .from("special_bookings")
        .select(`
          *,
          court:courts(id, name, court_type),
          reference_user:profiles!special_bookings_reference_user_id_fkey(full_name, member_id)
        `)
        .order("start_time", { ascending: false });

      // Si no es admin/operador, solo mostrar sus propias reservaciones y las de su familia
      if (!isAdminOrOperator) {
        // Obtener los miembros de la familia del usuario actual
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("member_id")
          .eq("id", user.id)
          .single();

        if (userProfile?.member_id) {
          const { data: familyProfiles } = await supabase
            .from("profiles")
            .select("id")
            .eq("member_id", userProfile.member_id);

          const familyUserIds = familyProfiles?.map(p => p.id) || [];

          regularQuery = regularQuery.in("user_id", familyUserIds);
          specialQuery = specialQuery.in("reference_user_id", familyUserIds);
        } else {
          regularQuery = regularQuery.eq("user_id", user.id);
          specialQuery = specialQuery.eq("reference_user_id", user.id);
        }
      }

      // Aplicar filtros de fecha
      if (filters.startDate) {
        const startDateISO = filters.startDate.toISOString();
        regularQuery = regularQuery.gte("start_time", startDateISO);
        specialQuery = specialQuery.gte("start_time", startDateISO);
      }

      if (filters.endDate) {
        const endDateISO = new Date(filters.endDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
        regularQuery = regularQuery.lte("start_time", endDateISO);
        specialQuery = specialQuery.lte("start_time", endDateISO);
      }

      // Ejecutar ambas consultas
      const [regularResult, specialResult] = await Promise.all([
        regularQuery,
        specialQuery
      ]);

      if (regularResult.error) throw regularResult.error;
      if (specialResult.error) throw specialResult.error;

      const regularBookings = regularResult.data || [];
      const specialBookings = specialResult.data || [];

      // Convertir special_bookings al formato de Booking con isSpecial: true
      const formattedSpecialBookings: Booking[] = specialBookings.map(booking => ({
        ...booking,
        isSpecial: true as const,
        user_id: booking.reference_user_id,
        user: booking.reference_user,
        payment_method: 'efectivo',
        actual_amount_charged: booking.custom_price || 0,
        amount: booking.custom_price || 0,
        currency: 'USD',
        payment_id: null,
        payment_gateway: null,
        payment_completed_at: booking.created_at,
        expires_at: null,
        booking_made_at: booking.created_at,
        status: 'paid' as const
      }));

      const formattedRegularBookings: Booking[] = regularBookings.map(booking => ({
        ...booking,
        isSpecial: false as const
      }));

      const allBookings = [...formattedRegularBookings, ...formattedSpecialBookings];

      // Aplicar filtros adicionales
      let filteredBookings = allBookings;

      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredBookings = filteredBookings.filter(booking => {
          const userName = booking.user?.full_name?.toLowerCase() || '';
          const memberId = booking.user?.member_id?.toLowerCase() || '';
          const courtName = booking.court?.name?.toLowerCase() || '';
          const receiptNumber = booking.payment_id?.toLowerCase() || '';
          
          return userName.includes(searchLower) ||
                 memberId.includes(searchLower) ||
                 courtName.includes(searchLower) ||
                 receiptNumber.includes(searchLower);
        });
      }

      if (filters.courtType) {
        filteredBookings = filteredBookings.filter(booking => 
          booking.court?.court_type === filters.courtType
        );
      }

      if (filters.paymentMethod) {
        filteredBookings = filteredBookings.filter(booking => 
          booking.payment_method === filters.paymentMethod
        );
      }

      // Ordenar por fecha más reciente primero
      return filteredBookings.sort((a, b) => 
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}