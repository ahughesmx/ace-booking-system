

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface CourtTypeDisplayProps {
  selectedCourtType: 'tennis' | 'padel';
  onBackToTypeSelection: () => void;
}

export function CourtTypeDisplay({ selectedCourtType, onBackToTypeSelection }: CourtTypeDisplayProps) {
  const getCourtTypeLabel = (courtType: 'tennis' | 'padel') => {
    return courtType === 'tennis' ? 'Cancha de tenis' : 'Cancha de pádel';
  };

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBackToTypeSelection}
        className="text-[#6898FE] hover:text-[#0FA0CE] hover:bg-[#6898FE]/10"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Cambiar tipo de cancha
      </Button>
      <span className="text-sm text-muted-foreground">
        {getCourtTypeLabel(selectedCourtType)}
      </span>
    </div>
  );
}

