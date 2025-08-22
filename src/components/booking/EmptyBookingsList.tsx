import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeSlotsGrid } from "@/components/TimeSlotsGrid";
import { format } from "date-fns";

interface EmptyBookingsListProps {
  isAuthenticated: boolean;
  bookedSlots: Set<string>;
  businessHours: {
    start: number;
    end: number;
  };
  selectedDate?: Date;
}

export function EmptyBookingsList({ 
  isAuthenticated, 
  bookedSlots, 
  businessHours, 
  selectedDate 
}: EmptyBookingsListProps) {
  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-[#1e3a8a]">Horarios disponibles</CardTitle>
          <p className="text-sm text-muted-foreground">
            {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM") : "Hoy"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="max-w-2xl mx-auto">
            <TimeSlotsGrid 
              bookedSlots={bookedSlots}
              businessHours={businessHours}
              selectedDate={selectedDate}
              showCourtCount={false}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#1e3a8a]">Reservas del día</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          No hay reservas para este día
        </p>
      </CardContent>
    </Card>
  );
}