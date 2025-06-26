
import { CanchaSelector } from "@/components/CourtSelector";
import { useActiveMaintenancePeriods } from "@/hooks/use-court-maintenance";
import type { Court } from "@/hooks/use-courts";

interface CourtSelectionProps {
  courts: Court[];
  selectedCourt: string | null;
  onCourtSelect: (courtId: string) => void;
}

export function CourtSelection({ courts, selectedCourt, onCourtSelect }: CourtSelectionProps) {
  const { data: maintenanceCourts = new Set() } = useActiveMaintenancePeriods();

  if (courts.length === 0) {
    return (
      <div className="text-center p-6 bg-[#6898FE]/5 rounded-lg border border-[#6898FE]/20">
        <p className="text-sm text-muted-foreground">
          No hay canchas disponibles en este momento
        </p>
      </div>
    );
  }

  if (courts.length === 1) {
    const court = courts[0];
    const isInMaintenance = maintenanceCourts.has(court.id);
    
    return (
      <div className={`border rounded-lg p-3 text-center ${
        isInMaintenance 
          ? "bg-red-50 border-red-200" 
          : "bg-[#6898FE]/5 border-[#6898FE]/20"
      }`}>
        <p className={`text-sm ${
          isInMaintenance ? "text-red-600" : "text-[#1e3a8a]"
        }`}>
          {isInMaintenance ? (
            <>🔧 Cancha en mantenimiento: <span className="font-semibold">{court.name}</span></>
          ) : (
            <>✓ Cancha seleccionada: <span className="font-semibold">{court.name}</span></>
          )}
        </p>
      </div>
    );
  }

  return (
    <CanchaSelector
      courts={courts}
      selectedCourt={selectedCourt}
      onCourtSelect={onCourtSelect}
      maintenanceCourts={maintenanceCourts}
    />
  );
}
