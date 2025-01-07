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

type MatchHeaderProps = {
  matchCount: number;
  isLoading: boolean;
  onCreateMatch: (isDoubles: boolean, bookingId: string) => void;
};

export function MatchHeader({ matchCount, isLoading, onCreateMatch }: MatchHeaderProps) {
  const [selectedBooking, setSelectedBooking] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: bookings = [] } = useQuery({
    queryKey: ["active-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          start_time,
          court:courts(name)
        `)
        .gte("end_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const handleCreateMatch = (isDoubles: boolean) => {
    if (selectedBooking) {
      onCreateMatch(isDoubles, selectedBooking);
      setIsDialogOpen(false);
      setSelectedBooking("");
    }
  };

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Partidos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {matchCount} partidos disponibles
          </p>
        </div>
        <Button
          disabled={true}
          className="bg-[#0A1A2A] hover:bg-[#152538]"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="h-5 w-5 mr-2" />
          Reserva una cancha primero
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center">
      <div>
        <h1 className="text-2xl font-bold">Partidos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {matchCount} partidos disponibles
        </p>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            disabled={isLoading}
            className="bg-[#0A1A2A] hover:bg-[#152538]"
          >
            <Plus className="h-5 w-5 mr-2" />
            {isLoading ? "Creando..." : "Crear Partido"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Partido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Selecciona una reserva</label>
              <Select
                value={selectedBooking}
                onValueChange={setSelectedBooking}
              >
                <SelectTrigger>
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

            <div className="flex gap-4">
              <Button
                className="flex-1"
                onClick={() => handleCreateMatch(false)}
                disabled={!selectedBooking}
              >
                <User className="h-4 w-4 mr-2" />
                Singles
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleCreateMatch(true)}
                disabled={!selectedBooking}
              >
                <Users className="h-4 w-4 mr-2" />
                Dobles
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}