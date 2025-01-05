import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export function MatchManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateMatch = async () => {
    try {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a match",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Create a booking first
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        })
        .select()
        .single();

      if (bookingError) {
        throw bookingError;
      }

      // Create the match
      const { error: matchError } = await supabase.from("matches").insert({
        booking_id: bookingData.id,
        player1_id: user.id,
        is_doubles: false,
      });

      if (matchError) {
        throw matchError;
      }

      toast({
        title: "Success",
        description: "Match created successfully",
      });

      navigate("/matches");
    } catch (error) {
      console.error("Error creating match:", error);
      toast({
        title: "Error",
        description: "Failed to create match. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create a Match</h1>
      <Button
        onClick={handleCreateMatch}
        disabled={isLoading}
        className="w-full md:w-auto"
      >
        {isLoading ? "Creating..." : "Create Match"}
      </Button>
    </div>
  );
}

export default MatchManagement;