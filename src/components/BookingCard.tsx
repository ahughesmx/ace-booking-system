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
  return (
    <Card>
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