
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CourtTypeSelectorProps {
  selectedType: 'tennis' | 'padel' | null;
  onTypeSelect: (type: 'tennis' | 'padel') => void;
}

export function CourtTypeSelector({ selectedType, onTypeSelect }: CourtTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-[#1e3a8a] mb-2">
          Selecciona el tipo de cancha
        </h3>
        <p className="text-sm text-muted-foreground">
          Elige entre tenis o pádel para ver las canchas disponibles
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Card
          className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
            selectedType === 'tennis'
              ? "border-[#6898FE] bg-gradient-to-br from-[#6898FE]/10 to-[#6898FE]/5"
              : "hover:border-[#6898FE]/50 border-[#6898FE]/20"
          }`}
          onClick={() => onTypeSelect('tennis')}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#6898FE] to-[#0FA0CE] rounded-full flex items-center justify-center mb-2">
              <span className="text-2xl">🎾</span>
            </div>
            <CardTitle className="text-lg">Tenis</CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-0">
            <p className="text-sm text-muted-foreground">
              Canchas de tenis tradicionales
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
            selectedType === 'padel'
              ? "border-[#6898FE] bg-gradient-to-br from-[#6898FE]/10 to-[#6898FE]/5"
              : "hover:border-[#6898FE]/50 border-[#6898FE]/20"
          }`}
          onClick={() => onTypeSelect('padel')}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#6898FE] to-[#0FA0CE] rounded-full flex items-center justify-center mb-2">
              <span className="text-2xl">🏓</span>
            </div>
            <CardTitle className="text-lg">Pádel</CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-0">
            <p className="text-sm text-muted-foreground">
              Canchas de pádel con paredes
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
