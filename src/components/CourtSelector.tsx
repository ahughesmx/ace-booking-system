import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { Court } from "@/hooks/use-courts";

interface CourtSelectorProps {
  courts: Court[];
  selectedCourt: string | null;
  onCourtSelect: (courtId: string) => void;
}

export function CourtSelector({ courts, selectedCourt, onCourtSelect }: CourtSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {courts.map((court) => (
        <Card
          key={court.id}
          className={`cursor-pointer transition-colors ${
            selectedCourt === court.id
              ? "border-primary"
              : "hover:border-primary/50"
          }`}
          onClick={() => onCourtSelect(court.id)}
        >
          <CardHeader>
            <CardTitle className="text-lg">{court.name}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}