import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import type { Match } from "@/types/match";

export function useMatches() {
  return useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      console.log("Fetching matches...");
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          booking_id,
          player1_id,
          player2_id,
          player1_sets,
          player2_sets,
          is_doubles,
          is_confirmed_player1,
          is_confirmed_player2,
          created_at,
          player1_partner_id,
          player2_partner_id,
          booking:bookings (
            start_time,
            court:courts (
              name
            )
          ),
          player1:profiles!matches_player1_id_fkey_profiles (
            id,
            full_name
          ),
          player2:profiles!matches_player2_id_fkey_profiles (
            id,
            full_name
          ),
          player1_partner:profiles!matches_player1_partner_id_fkey_profiles (
            id,
            full_name
          ),
          player2_partner:profiles!matches_player2_partner_id_fkey_profiles (
            id,
            full_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching matches:", error);
        throw error;
      }

      console.log("Matches data:", data);
      
      return data.map(match => ({
        ...match,
        booking: match.booking ? {
          start_time: match.booking.start_time,
          court: match.booking.court ? {
            name: match.booking.court.name
          } : undefined
        } : null
      }));
    },
  });
}