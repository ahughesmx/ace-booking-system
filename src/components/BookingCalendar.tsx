import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { BookingForm } from "@/components/BookingForm";
import { BookingsList } from "@/components/BookingsList";
import { useBookings } from "@/hooks/use-bookings";

export default function BookingCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: bookings = [], refetch: refetchBookings } = useBookings(selectedDate);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:sticky md:top-4 h-fit">
        <CardHeader>
          <CardTitle>Reserva tu Cancha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="mx-auto"
            />
          </div>
          
          <BookingForm 
            selectedDate={selectedDate}
            onBookingSuccess={() => {
              refetchBookings();
              toast({
                title: "Reserva exitosa",
                description: "Tu cancha ha sido reservada correctamente.",
              });
            }}
          />
        </CardContent>
      </Card>

      <BookingsList 
        bookings={bookings}
        onCancelSuccess={() => {
          refetchBookings();
          toast({
            title: "Reserva cancelada",
            description: "La reserva ha sido cancelada correctamente.",
          });
        }}
      />
    </div>
  );
}