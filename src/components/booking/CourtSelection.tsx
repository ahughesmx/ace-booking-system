
import { CanchaSelector } from "@/components/CourtSelector";
import type { Court } from "@/hooks/use-courts";

interface CourtSelectionProps {
  courts: Court[];
  selectedCourt: string | null;
  onCourtSelect: (courtId: string) => void;
}

export function CourtSelection({ courts, selectedCourt, onCourtSelect }: CourtSelectionProps) {
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
    return (
      <div className="bg-[#6898FE]/5 border border-[#6898FE]/20 rounded-lg p-3 text-center">
        <p className="text-sm text-[#1e3a8a]">
          ✓ Cancha seleccionada: <span className="font-semibold">{courts[0].name}</span>
        </p>
      </div>
    );
  }

  return (
    <CanchaSelector
      courts={courts}
      selectedCourt={selectedCourt}
      onCourtSelect={onCourtSelect}
    />
  );
}
