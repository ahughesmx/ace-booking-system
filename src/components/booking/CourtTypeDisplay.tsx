

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface CourtTypeDisplayProps {
  selectedCourtType: string;
  onBackToTypeSelection: () => void;
}

export function CourtTypeDisplay({ selectedCourtType, onBackToTypeSelection }: CourtTypeDisplayProps) {
  const getCourtTypeLabel = (courtType: string) => {
    switch (courtType) {
      case 'tennis': return 'Cancha de tenis';
      case 'padel': return 'Cancha de pádel';
      case 'football': return 'Cancha de fútbol';
      default: return `Cancha de ${courtType}`;
    }
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

