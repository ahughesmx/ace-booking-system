import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Trash2 } from "lucide-react";

type Booking = {
  id: string;
  court_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  court: {
    name: string;
  };
  user: {
    full_name: string;
  };
};

type Court = {
  id: string;
  name: string;
};

export default function BookingCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: courts } = useQuery({
    queryKey: ["courts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courts")
        .select("*");
      
      if (error) throw error;
      return data as Court[];
    },
  });

  const { data: bookings, refetch: refetchBookings } = useQuery({
    queryKey: ["bookings", selectedDate],
    queryFn: async () => {
      if (!selectedDate) return [];
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          court:courts (
            name
          ),
          user:profiles (
            full_name
          )
        `)
        .gte("start_time", startOfDay.toISOString())
        .lte("end_time", endOfDay.toISOString());
      
      if (error) throw error;
      return data as Booking[];
    },
  });

  const availableTimeSlots = [
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00"
  ];

  const isTimeSlotAvailable = (time: string, courtId: string) => {
    if (!bookings) return true;
    
    const [hours] = time.split(":");
    const slotStart = new Date(selectedDate!);
    slotStart.setHours(parseInt(hours), 0, 0, 0);
    
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(slotStart.getHours() + 1);

    return !bookings.some(booking => 
      booking.court_id === courtId &&
      new Date(booking.start_time) < slotEnd &&
      new Date(booking.end_time) > slotStart
    );
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !selectedCourt || !user) {
      toast({
        title: "Error",
        description: "Por favor selecciona una fecha, cancha y horario.",
        variant: "destructive",
      });
      return;
    }

    const [hours] = selectedTime.split(":");
    const startTime = new Date(selectedDate);
    startTime.setHours(parseInt(hours), 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1);

    try {
      const { error } = await supabase
        .from("bookings")
        .insert({
          court_id: selectedCourt,
          user_id: user.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Reserva exitosa",
        description: "Tu cancha ha sido reservada correctamente.",
      });

      refetchBookings();
      setSelectedTime(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo realizar la reserva. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "Reserva cancelada",
        description: "La reserva ha sido cancelada correctamente.",
      });

      refetchBookings();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cancelar la reserva. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reserva tu cancha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </div>

          {courts && courts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courts.map((court) => (
                <Card
                  key={court.id}
                  className={`cursor-pointer transition-colors ${
                    selectedCourt === court.id
                      ? "border-primary"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedCourt(court.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{court.name}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          {selectedCourt && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {availableTimeSlots.map((time) => (
                <Button
                  key={time}
                  variant={selectedTime === time ? "default" : "outline"}
                  className="w-full"
                  disabled={!isTimeSlotAvailable(time, selectedCourt)}
                  onClick={() => setSelectedTime(time)}
                >
                  {time}
                </Button>
              ))}
            </div>
          )}

          <Button
            className="w-full"
            disabled={!selectedDate || !selectedTime || !selectedCourt}
            onClick={handleBooking}
          >
            Reservar cancha
          </Button>
        </CardContent>
      </Card>

      {bookings && bookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reservas del día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          {booking.court?.name || "Cancha sin nombre"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.start_time).toLocaleTimeString()} -{" "}
                          {new Date(booking.end_time).toLocaleTimeString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Reservado por: {booking.user?.full_name || "Usuario desconocido"}
                        </p>
                      </div>
                      {user?.id === booking.user_id && (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleCancelBooking(booking.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}