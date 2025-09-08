import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBookingRules } from "@/hooks/use-booking-rules";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Save } from "lucide-react";

export function ReschedulingRulesManagement() {
  const { data: allRules } = useBookingRules();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<{ [courtType: string]: { allow_rescheduling: boolean; min_hours: number } }>({});

  // Initialize form data when rules are loaded
  useState(() => {
    if (allRules && Array.isArray(allRules)) {
      const initialData: { [courtType: string]: { allow_rescheduling: boolean; min_hours: number } } = {};
      allRules.forEach(rule => {
        // Parse interval string (format: "HH:MM:SS")
        const [hours, minutes] = rule.min_rescheduling_time?.split(':').map(Number) || [24, 0];
        const totalHours = hours + (minutes / 60);
        
        initialData[rule.court_type] = {
          allow_rescheduling: rule.allow_rescheduling ?? true,
          min_hours: totalHours
        };
      });
      setFormData(initialData);
    }
  });

  const updateRulesMutation = useMutation({
    mutationFn: async (updates: { courtType: string; allow_rescheduling: boolean; min_hours: number }[]) => {
      for (const update of updates) {
        const intervalString = `${Math.floor(update.min_hours).toString().padStart(2, '0')}:${Math.floor((update.min_hours % 1) * 60).toString().padStart(2, '0')}:00`;
        
        const { error } = await supabase
          .from('booking_rules')
          .update({
            allow_rescheduling: update.allow_rescheduling,
            min_rescheduling_time: intervalString
          })
          .eq('court_type', update.courtType);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Configuración actualizada",
        description: "Las reglas de reagendamiento se actualizaron correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['booking-rules'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la configuración",
        variant: "destructive",
      });
    }
  });

  const handleFormChange = (courtType: string, field: 'allow_rescheduling' | 'min_hours', value: boolean | number) => {
    setFormData(prev => ({
      ...prev,
      [courtType]: {
        ...prev[courtType],
        [field]: value
      }
    }));
  };

  const handleSaveAll = () => {
    if (!allRules || !Array.isArray(allRules)) return;

    const updates = Object.entries(formData).map(([courtType, data]) => ({
      courtType,
      allow_rescheduling: data.allow_rescheduling,
      min_hours: data.min_hours
    }));

    updateRulesMutation.mutate(updates);
  };

  if (!allRules || !Array.isArray(allRules)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5" />
            Configuración de Reagendamiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">Cargando configuración...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5" />
          Configuración de Reagendamiento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {allRules.map((rule) => (
          <div key={rule.court_type} className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-lg capitalize">
              Canchas de {rule.court_type === 'tennis' ? 'Tenis' : 'Pádel'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id={`allow-rescheduling-${rule.court_type}`}
                  checked={formData[rule.court_type]?.allow_rescheduling ?? rule.allow_rescheduling ?? true}
                  onCheckedChange={(checked) => handleFormChange(rule.court_type, 'allow_rescheduling', checked)}
                />
                <Label htmlFor={`allow-rescheduling-${rule.court_type}`}>
                  Permitir reagendamiento
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`min-hours-${rule.court_type}`}>
                  Horas mínimas de anticipación
                </Label>
                <Input
                  id={`min-hours-${rule.court_type}`}
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData[rule.court_type]?.min_hours ?? 24}
                  onChange={(e) => handleFormChange(rule.court_type, 'min_hours', parseFloat(e.target.value) || 0)}
                  disabled={!formData[rule.court_type]?.allow_rescheduling}
                  className="w-full"
                />
              </div>
            </div>

            {formData[rule.court_type]?.allow_rescheduling && (
              <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                Los usuarios podrán reagendar sus reservas hasta {formData[rule.court_type]?.min_hours || 24} horas antes del horario programado.
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-end">
          <Button 
            onClick={handleSaveAll}
            disabled={updateRulesMutation.isPending}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {updateRulesMutation.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}