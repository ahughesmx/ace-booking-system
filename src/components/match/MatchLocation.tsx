import { MapPin } from "lucide-react";

type MatchLocationProps = {
  courtName: string | null | undefined;
};

export function MatchLocation({ courtName }: MatchLocationProps) {
  return (
    <div className="flex items-center text-sm text-muted-foreground">
      <MapPin className="h-4 w-4 mr-2" />
      <span>{courtName || "Cancha por asignar"}</span>
    </div>
  );
}