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
          id,
          match_id,
          sender_id,
          recipient_id,
          status,
          created_at,
          updated_at,
          match:matches (
            booking:bookings (
              start_time,
              court:courts (name)
            ),
            player1:profiles!player1_id (full_name)
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