
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourtTypeSettingsForm } from "./court-type-settings/CourtTypeSettingsForm";

type CourtTypeSettings = {
  id: string;
  court_type: string;
  operating_hours_start: string;
  operating_hours_end: string;
  min_booking_duration: number;
  max_booking_duration: number;
  default_booking_duration: number;
  price_per_hour: number;
  operador_price_per_hour: number;
  peak_hours_start: string;
  peak_hours_end: string;
  peak_hours_multiplier: number;
  max_capacity: number;
  advance_booking_days: number;
  weekend_price_multiplier: number;
  operating_days: string[];
  created_at: string;
  updated_at: string;
};

export default function CourtTypeSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { data: settings, refetch } = useQuery({
    queryKey: ["court-type-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("court_type_settings")
        .select("*")
        .order("court_type");

      if (error) throw error;
      return data as CourtTypeSettings[];
    },
  });

  const handleUpdateSettings = async (courtType: string, updatedSettings: Partial<CourtTypeSettings>) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("court_type_settings")
        .update(updatedSettings)
        .eq("court_type", courtType);

      if (error) throw error;

      await refetch();
      toast({
        title: "Configuración actualizada",
        description: `La configuración de ${courtType === 'tennis' ? 'tenis' : 'pádel'} ha sido actualizada exitosamente.`,
      });
    } catch (error) {
      console.error("Error updating court type settings:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const tennisSettings = settings?.find(s => s.court_type === 'tennis');
  const padelSettings = settings?.find(s => s.court_type === 'padel');

  return (
    <Card className="bg-white shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-800">
          Configuración por Tipo de Cancha
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tennis" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tennis" className="flex items-center gap-2">
              🎾 Tenis
            </TabsTrigger>
            <TabsTrigger value="padel" className="flex items-center gap-2">
              🏓 Pádel
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tennis" className="mt-6">
            {tennisSettings && (
              <CourtTypeSettingsForm
                settings={tennisSettings}
                onUpdateSettings={(updatedSettings) => 
                  handleUpdateSettings('tennis', updatedSettings)
                }
                loading={loading}
                courtTypeLabel="Tenis"
              />
            )}
          </TabsContent>
          
          <TabsContent value="padel" className="mt-6">
            {padelSettings && (
              <CourtTypeSettingsForm
                settings={padelSettings}
                onUpdateSettings={(updatedSettings) => 
                  handleUpdateSettings('padel', updatedSettings)
                }
                loading={loading}
                courtTypeLabel="Pádel"
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
