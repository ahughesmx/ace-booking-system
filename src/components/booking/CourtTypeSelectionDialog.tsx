
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAvailableCourtTypes } from "@/hooks/use-available-court-types";

interface CourtTypeSelectionDialogProps {
  open: boolean;
  onCourtTypeSelect: (courtType: string) => void;
}

export function CourtTypeSelectionDialog({ open, onCourtTypeSelect }: CourtTypeSelectionDialogProps) {
  const { data: availableTypes = [] } = useAvailableCourtTypes(true);
  
  // Remover auto-selección para evitar conflictos con otros sistemas
  // useEffect(() => {
  //   if (open && availableTypes.length === 1) {
  //     console.log('Dialog auto-selecting single type:', availableTypes[0].type_name);
  //     onCourtTypeSelect(availableTypes[0].type_name);
  //   }
  // }, [open, availableTypes, onCourtTypeSelect]);
  
  // No mostrar el diálogo si solo hay un tipo disponible o si está cerrado
  if (!open || availableTypes.length <= 1) {
    return null;
  }
  
  const getIcon = (typeName: string) => {
    switch (typeName) {
      case 'tennis': return '🎾';
      case 'padel': return '🏓';
      case 'football': return '⚽';
      default: return '🏟️';
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-[#1e3a8a]">
            Selecciona el tipo de cancha
          </DialogTitle>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Elige el tipo de cancha para ver las canchas disponibles
          </p>
        </DialogHeader>
        
        <div className={`grid gap-4 mt-6 ${availableTypes.length === 2 ? 'grid-cols-2' : availableTypes.length === 3 ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {availableTypes.map((type) => (
            <Card
              key={type.id}
              className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-[#6898FE]/50 border-[#6898FE]/20"
              onClick={() => onCourtTypeSelect(type.type_name)}
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
      </DialogContent>
    </Dialog>
  );
}
