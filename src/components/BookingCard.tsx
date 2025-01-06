import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { Booking } from "@/types/booking";

type BookingCardProps = {
  booking: Booking;
  isOwner: boolean;
  onCancel: (id: string) => void;
};

export function BookingCard({ booking, isOwner, onCancel }: BookingCardProps) {
  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium">
              {booking.court?.name || "Cancha sin nombre"}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
            </p>
            <p className="text-sm text-muted-foreground">
              Reservado por: {booking.user?.full_name || "Usuario desconocido"}
            </p>
          </div>
          {isOwner && (
            <Button
              variant="destructive"
              size="icon"
              onClick={() => onCancel(booking.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}