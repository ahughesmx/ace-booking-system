
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CourtTypeSelectionDialogProps {
  open: boolean;
  onCourtTypeSelect: (courtType: 'tennis' | 'padel') => void;
}

export function CourtTypeSelectionDialog({ open, onCourtTypeSelect }: CourtTypeSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-[#1e3a8a]">
            Selecciona el tipo de cancha
          </DialogTitle>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Elige entre tenis o pádel para ver las canchas disponibles
          </p>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          <Card
            className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-[#6898FE]/50 border-[#6898FE]/20"
            onClick={() => onCourtTypeSelect('tennis')}
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
            className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-[#6898FE]/50 border-[#6898FE]/20"
            onClick={() => onCourtTypeSelect('padel')}
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
      </DialogContent>
    </Dialog>
  );
}
