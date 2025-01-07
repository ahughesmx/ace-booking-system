import { Plus, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

type MatchHeaderProps = {
  matchCount: number;
  isLoading: boolean;
  onCreateMatch: (isDoubles: boolean, bookingId: string) => void;
};

export function MatchHeader({ matchCount, isLoading, onCreateMatch }: MatchHeaderProps) {
  const [selectedBooking, setSelectedBooking] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  const { data: bookings = [] } = useQuery({
    queryKey: ["active-bookings"],
    queryFn: async () => {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          id,
          start_time,
          court:courts(name)
        `)
        .gte("end_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      if (bookingsError) throw bookingsError;

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("booking_id");

      if (matchesError) throw matchesError;

      const bookingsWithMatches = new Set(matchesData.map(match => match.booking_id));
      return (bookingsData || []).filter(booking => !bookingsWithMatches.has(booking.id));
    },
  });

  const handleCreateMatch = (isDoubles: boolean) => {
    if (selectedBooking) {
      onCreateMatch(isDoubles, selectedBooking);
      setIsDialogOpen(false);
      setSelectedBooking("");
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center bg-gradient-to-r from-[#33C3F0]/10 to-transparent p-6 rounded-lg border border-[#33C3F0]/20">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#33C3F0] to-[#0FA0CE]">
            Partidos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {matchCount} {matchCount === 1 ? "partido disponible" : "partidos disponibles"}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={isLoading || bookings.length === 0}
              className="bg-[#33C3F0] hover:bg-[#0FA0CE] transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              size={isMobile ? "sm" : "default"}
            >
              <Plus className="h-5 w-5 mr-2" />
              {bookings.length === 0 ? "Reserva una cancha primero" : "Crear Partido"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-xl font-bold">
                Crear Nuevo Partido
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Selecciona una reserva
                </label>
                <Select
                  value={selectedBooking}
                  onValueChange={setSelectedBooking}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona una reserva" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookings.map((booking) => (
                      <SelectItem key={booking.id} value={booking.id}>
                        {format(new Date(booking.start_time), "dd/MM/yyyy HH:mm")} - {booking.court?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => handleCreateMatch(false)}
                  disabled={!selectedBooking}
                  variant="outline"
                  className="w-full hover:bg-[#33C3F0]/10 border-[#33C3F0]/20"
                >
                  <User className="h-4 w-4 mr-2" />
                  Singles
                </Button>
                <Button
                  onClick={() => handleCreateMatch(true)}
                  disabled={!selectedBooking}
                  variant="outline"
                  className="w-full hover:bg-[#33C3F0]/10 border-[#33C3F0]/20"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Dobles
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}