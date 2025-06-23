
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";

export function useMatchActions(refetchMatches: () => void) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreateMatch = async (userId: string | undefined, isDoubles: boolean = false, bookingId: string) => {
    try {
      setIsLoading(true);

      if (!userId) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión para crear un partido",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Get the booking to check court type
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select(`
          *,
          court:courts(court_type)
        `)
        .eq("id", bookingId)
        .single();

      if (bookingError) throw bookingError;

      // If court is padel, automatically set to doubles
      const shouldBeDoubles = booking.court.court_type === 'padel' ? true : isDoubles;

      const { error: matchError } = await supabase
        .from("matches")
        .insert({
          booking_id: bookingId,
          player1_id: userId,
          is_doubles: shouldBeDoubles,
        });

      if (matchError) throw matchError;

      toast({
        title: "¡Éxito!",
        description: `Partido de ${shouldBeDoubles ? 'dobles' : 'singles'} creado correctamente${booking.court.court_type === 'padel' ? ' (automáticamente configurado como dobles para pádel)' : ''}`,
      });

      refetchMatches();
    } catch (error) {
      console.error("Error creating match:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el partido. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateResult = async (
    matchId: string,
    player1Sets: number,
    player2Sets: number
  ) => {
    try {
      const { error } = await supabase
        .from("matches")
        .update({
          player1_sets: player1Sets,
          player2_sets: player2Sets,
        })
        .eq("id", matchId);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Resultado actualizado correctamente",
      });

      refetchMatches();
    } catch (error) {
      console.error("Error updating match result:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el resultado. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchId);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Partido eliminado correctamente",
      });

      refetchMatches();
    } catch (error) {
      console.error("Error deleting match:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el partido. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  return {
    isLoading,
    handleCreateMatch,
    handleUpdateResult,
    handleDeleteMatch,
  };
}
