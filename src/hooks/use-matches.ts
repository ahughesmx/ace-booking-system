import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import type { Match } from "@/types/match";
import { useEffect } from "react";

export function useMatches() {
  const { data, refetch } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      console.log("Iniciando fetch de matches...");
      
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          player1:profiles!matches_player1_id_fkey_profiles (
            full_name
          ),
          player2:profiles!matches_player2_id_fkey_profiles (
            full_name
          ),
          player1_partner:profiles!matches_player1_partner_id_fkey_profiles (
            full_name
          ),
          player2_partner:profiles!matches_player2_partner_id_fkey_profiles (
            full_name
          ),
          booking:bookings!matches_booking_id_fkey (
            start_time,
            court:courts (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (matchesError) {
        console.error("Error al obtener matches:", matchesError);
        throw matchesError;
      }

      if (!matchesData) {
        console.log("No se encontraron matches");
        return [];
      }

      console.log("Datos de matches obtenidos:", matchesData);

      const matches: Match[] = matchesData.map(match => {
        console.log('Procesando match:', {
          id: match.id,
          is_confirmed_player1: match.is_confirmed_player1,
          is_confirmed_player2: match.is_confirmed_player2
        });
        
        return {
          id: match.id,
          booking_id: match.booking_id,
          player1_id: match.player1_id,
          player2_id: match.player2_id,
          player1_sets: match.player1_sets,
          player2_sets: match.player2_sets,
          is_doubles: match.is_doubles,
          is_confirmed_player1: match.is_confirmed_player1,
          is_confirmed_player2: match.is_confirmed_player2,
          created_at: match.created_at,
          player1_partner_id: match.player1_partner_id,
          player2_partner_id: match.player2_partner_id,
          player1: match.player1 ? {
            full_name: match.player1.full_name
          } : null,
          player2: match.player2 ? {
            full_name: match.player2.full_name
          } : null,
          player1_partner: match.player1_partner ? {
            full_name: match.player1_partner.full_name
          } : null,
          player2_partner: match.player2_partner ? {
            full_name: match.player2_partner.full_name
          } : null,
          booking: match.booking ? {
            start_time: match.booking.start_time,
            court: match.booking.court ? {
              name: match.booking.court.name
            } : null
          } : null
        };
      });

      return matches;
    }
  });

  useEffect(() => {
    const channel = supabase
      .channel('matches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches'
        },
        (payload) => {
          console.log('Cambio detectado en matches:', payload);
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return { data, refetch };
}