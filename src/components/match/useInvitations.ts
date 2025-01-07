import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { MatchInvitation } from "@/types/match-invitation";

export const useInvitations = (userId: string | undefined) => {
  return useQuery<MatchInvitation[]>({
    queryKey: ["pendingInvitations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_invitations")
        .select(`
          *,
          match:matches (
            id,
            player1:profiles!player1_id (
              id,
              full_name
            ),
            player2:profiles!player2_id (
              id,
              full_name
            ),
            booking:bookings (
              id,
              start_time,
              court:courts (
                id,
                name
              )
            ),
            is_confirmed_player1,
            is_confirmed_player2,
            is_doubles,
            player1_partner:profiles!player1_partner_id (
              id,
              full_name
            ),
            player2_partner:profiles!player2_partner_id (
              id,
              full_name
            )
          )
        `)
        .eq("recipient_id", userId)
        .eq("status", "pending");

      if (error) throw error;
      return (data || []) as MatchInvitation[];
    },
    enabled: !!userId,
  });
};