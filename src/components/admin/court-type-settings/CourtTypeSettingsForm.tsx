
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

type CourtTypeSettings = {
  id: string;
  court_type: string;
  operating_hours_start: string;
  operating_hours_end: string;
  min_booking_duration: number;
  max_booking_duration: number;
  default_booking_duration: number;
  price_per_hour: number;
  peak_hours_start: string;
  peak_hours_end: string;
  peak_hours_multiplier: number;
  max_capacity: number;
  advance_booking_days: number;
  weekend_price_multiplier: number;
  operating_days: string[];
};

type CourtTypeSettingsFormProps = {
  settings: CourtTypeSettings;
  onUpdateSettings: (settings: Partial<CourtTypeSettings>) => Promise<void>;
  loading: boolean;
  courtTypeLabel: string;
};

const daysOfWeek = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

export function CourtTypeSettingsForm({ 
  settings, 
  onUpdateSettings, 
  loading, 
  courtTypeLabel 
}: CourtTypeSettingsFormProps) {
  const [formData, setFormData] = useState(settings);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings(formData);
  };

  const handleDayToggle = (day: string, checked: boolean) => {
    const updatedDays = checked
      ? [...formData.operating_days, day]
      : formData.operating_days.filter(d => d !== day);
    
    setFormData({ ...formData, operating_days: updatedDays });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Horarios de Operación */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Horarios de Operación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="operating_hours_start">Hora de Apertura</Label>
                <Input
                  id="operating_hours_start"
                  type="time"
                  value={formData.operating_hours_start}
                  onChange={(e) => setFormData({ ...formData, operating_hours_start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="operating_hours_end">Hora de Cierre</Label>
                <Input
                  id="operating_hours_end"
                  type="time"
                  value={formData.operating_hours_end}
                  onChange={(e) => setFormData({ ...formData, operating_hours_end: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Días de Operación</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {daysOfWeek.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={day.value}
                      checked={formData.operating_days.includes(day.value)}
                      onCheckedChange={(checked) => handleDayToggle(day.value, checked === true)}
                    />
                    <Label htmlFor={day.value} className="text-sm">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Reservas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuración de Reservas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="min_booking_duration">Duración Mínima (minutos)</Label>
              <Input
                id="min_booking_duration"
                type="number"
                value={formData.min_booking_duration}
                onChange={(e) => setFormData({ ...formData, min_booking_duration: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="max_booking_duration">Duración Máxima (minutos)</Label>
              <Input
                id="max_booking_duration"
                type="number"
                value={formData.max_booking_duration}
                onChange={(e) => setFormData({ ...formData, max_booking_duration: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="default_booking_duration">Duración Por Defecto (minutos)</Label>
              <Input
                id="default_booking_duration"
                type="number"
                value={formData.default_booking_duration}
                onChange={(e) => setFormData({ ...formData, default_booking_duration: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="max_capacity">Capacidad Máxima</Label>
              <Input
                id="max_capacity"
                type="number"
                value={formData.max_capacity}
                onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="advance_booking_days">Días de Anticipación Máximos</Label>
              <Input
                id="advance_booking_days"
                type="number"
                value={formData.advance_booking_days}
                onChange={(e) => setFormData({ ...formData, advance_booking_days: parseInt(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Precios */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuración de Precios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="price_per_hour">Precio por Hora ($)</Label>
              <Input
                id="price_per_hour"
                type="number"
                step="0.01"
                value={formData.price_per_hour}
                onChange={(e) => setFormData({ ...formData, price_per_hour: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="weekend_price_multiplier">Multiplicador Fin de Semana</Label>
              <Input
                id="weekend_price_multiplier"
                type="number"
                step="0.01"
                value={formData.weekend_price_multiplier}
                onChange={(e) => setFormData({ ...formData, weekend_price_multiplier: parseFloat(e.target.value) })}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h4 className="font-medium">Horarios Pico</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="peak_hours_start">Inicio Hora Pico</Label>
                  <Input
                    id="peak_hours_start"
                    type="time"
                    value={formData.peak_hours_start}
                    onChange={(e) => setFormData({ ...formData, peak_hours_start: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="peak_hours_end">Final Hora Pico</Label>
                  <Input
                    id="peak_hours_end"
                    type="time"
                    value={formData.peak_hours_end}
                    onChange={(e) => setFormData({ ...formData, peak_hours_end: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="peak_hours_multiplier">Multiplicador Hora Pico</Label>
                <Input
                  id="peak_hours_multiplier"
                  type="number"
                  step="0.01"
                  value={formData.peak_hours_multiplier}
                  onChange={(e) => setFormData({ ...formData, peak_hours_multiplier: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={loading}
          className="bg-[#6898FE] hover:bg-[#0FA0CE] text-white"
        >
          {loading ? "Guardando..." : `Guardar Configuración de ${courtTypeLabel}`}
        </Button>
      </div>
    </form>
  );
}
