
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { Court } from "@/hooks/use-courts";

interface CanchaSelectorProps {
  courts: Court[];
  selectedCourt: string | null;
  onCourtSelect: (courtId: string) => void;
  maintenanceCourts?: Set<string>;
}

export function CanchaSelector({ courts, selectedCourt, onCourtSelect, maintenanceCourts = new Set() }: CanchaSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {courts.map((court) => {
        const isInMaintenance = maintenanceCourts.has(court.id);
        const isSelected = selectedCourt === court.id && !isInMaintenance;
        
        return (
          <Card
            key={court.id}
            className={`transition-colors ${
              isInMaintenance
                ? "bg-red-50 border-red-200 cursor-not-allowed opacity-75"
                : `cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`
            }`}
            onClick={() => {
              if (!isInMaintenance) {
                onCourtSelect(court.id);
              }
            }}
          >
            <CardHeader className="flex items-center justify-center p-3">
              <CardTitle className={`text-base text-center ${
                isInMaintenance ? "text-red-600" : ""
              }`}>
                {isInMaintenance ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <span>🔧</span>
                      <span>{court.name}</span>
                    </div>
                    <div className="text-xs text-red-500">
                      En mantenimiento
                    </div>
                  </div>
                ) : (
                  court.name
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
