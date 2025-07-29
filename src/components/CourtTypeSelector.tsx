
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAvailableCourtTypes } from "@/hooks/use-available-court-types";

interface CourtTypeSelectorProps {
  selectedType: string | null;
  onTypeSelect: (type: string) => void;
}

export function CourtTypeSelector({ selectedType, onTypeSelect }: CourtTypeSelectorProps) {
  const { data: availableTypes = [] } = useAvailableCourtTypes(true);

  console.log('CourtTypeSelector - availableTypes received:', availableTypes);
  console.log('CourtTypeSelector - availableTypes.length:', availableTypes.length);

  // Íconos por tipo de cancha
  const getIcon = (typeName: string) => {
    switch (typeName) {
      case 'tennis': return '🎾';
      case 'padel': return '🏓';
      case 'football': return '⚽';
      default: return '🏟️';
    }
  };
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-[#1e3a8a] mb-2">
          Selecciona el tipo de cancha
        </h3>
        <p className="text-sm text-muted-foreground">
          Elige el tipo de cancha para ver las canchas disponibles
        </p>
      </div>
      
      <div className={`grid gap-4 ${availableTypes.length === 2 ? 'grid-cols-2' : availableTypes.length === 3 ? 'grid-cols-3' : 'grid-cols-1'}`}>
        {availableTypes.map((type) => (
          <Card
            key={type.id}
            className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
              selectedType === type.type_name
                ? "border-[#6898FE] bg-gradient-to-br from-[#6898FE]/10 to-[#6898FE]/5"
                : "hover:border-[#6898FE]/50 border-[#6898FE]/20"
            }`}
            onClick={() => onTypeSelect(type.type_name)}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#6898FE] to-[#0FA0CE] rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl">{getIcon(type.type_name)}</span>
              </div>
              <CardTitle className="text-lg">{type.display_name}</CardTitle>
            </CardHeader>
            <CardContent className="text-center pt-0">
              <p className="text-sm text-muted-foreground">
                Canchas de {type.display_name.toLowerCase()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
