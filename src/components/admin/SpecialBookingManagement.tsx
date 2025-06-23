
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type SpecialBooking = {
  id: string;
  court_id: string;
  event_type: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  price_type: string;
  custom_price: number;
  is_recurring: boolean;
  recurrence_pattern: string[];
  created_at: string;
  court: {
    name: string;
    court_type: string;
  };
};

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' }
];

const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 7;
  return `${hour.toString().padStart(2, "0")}:00`;
});

export default function SpecialBookingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    court_id: '',
    event_type: '',
    title: '',
    description: '',
    selected_date: null as Date | null,
    start_time: '',
    end_time: '',
    price_type: 'normal',
    custom_price: 0,
    is_recurring: false,
    recurrence_pattern: [] as string[]
  });

  const { data: courts } = useQuery({
    queryKey: ["courts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courts")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: specialBookings, refetch } = useQuery({
    queryKey: ["special-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_bookings")
        .select(`
          *,
          court:courts(name, court_type)
        `)
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data as SpecialBooking[];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.court_id || !formData.event_type || !formData.title || !formData.selected_date || !formData.start_time || !formData.end_time) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const startDateTime = new Date(formData.selected_date);
      const [startHour, startMinute] = formData.start_time.split(':').map(Number);
      startDateTime.setHours(startHour, startMinute, 0, 0);

      const endDateTime = new Date(formData.selected_date);
      const [endHour, endMinute] = formData.end_time.split(':').map(Number);
      endDateTime.setHours(endHour, endMinute, 0, 0);

      const bookingData = {
        court_id: formData.court_id,
        event_type: formData.event_type,
        title: formData.title,
        description: formData.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        price_type: formData.price_type,
        custom_price: formData.price_type === 'custom' ? formData.custom_price : null,
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null
      };

      const { error } = await supabase
        .from("special_bookings")
        .insert(bookingData);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Reserva especial creada correctamente",
      });

      // Reset form
      setFormData({
        court_id: '',
        event_type: '',
        title: '',
        description: '',
        selected_date: null,
        start_time: '',
        end_time: '',
        price_type: 'normal',
        custom_price: 0,
        is_recurring: false,
        recurrence_pattern: []
      });
      setIsCreating(false);
      refetch();
    } catch (error) {
      console.error("Error creating special booking:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la reserva especial",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSpecialBooking = async (id: string) => {
    try {
      const { error } = await supabase
        .from("special_bookings")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Reserva especial eliminada correctamente",
      });
      refetch();
    } catch (error) {
      console.error("Error deleting special booking:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la reserva especial",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Reservas Especiales</h2>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Reserva Especial
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Crear Reserva Especial</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="event_type">Tipo de Evento</Label>
                  <Select 
                    value={formData.event_type} 
                    onValueChange={(value) => setFormData({...formData, event_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="torneo">Torneo</SelectItem>
                      <SelectItem value="clases">Clases</SelectItem>
                      <SelectItem value="eventos">Eventos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="court_id">Cancha</Label>
                  <Select 
                    value={formData.court_id} 
                    onValueChange={(value) => setFormData({...formData, court_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cancha" />
                    </SelectTrigger>
                    <SelectContent>
                      {courts?.map((court) => (
                        <SelectItem key={court.id} value={court.id}>
                          {court.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="title">Título del Evento</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Nombre del evento"
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descripción del evento"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Fecha</Label>
                  <Calendar
                    mode="single"
                    selected={formData.selected_date}
                    onSelect={(date) => setFormData({...formData, selected_date: date})}
                    locale={es}
                    className="rounded-md border"
                  />
                </div>

                <div>
                  <Label htmlFor="start_time">Hora Inicio</Label>
                  <Select 
                    value={formData.start_time} 
                    onValueChange={(value) => setFormData({...formData, start_time: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hora inicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="end_time">Hora Fin</Label>
                  <Select 
                    value={formData.end_time} 
                    onValueChange={(value) => setFormData({...formData, end_time: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hora fin" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Opciones de Precio</Label>
                <Select 
                  value={formData.price_type} 
                  onValueChange={(value) => setFormData({...formData, price_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Precio Normal</SelectItem>
                    <SelectItem value="custom">Precio Especial</SelectItem>
                  </SelectContent>
                </Select>
                
                {formData.price_type === 'custom' && (
                  <div>
                    <Label htmlFor="custom_price">Precio Personalizado</Label>
                    <Input
                      id="custom_price"
                      type="number"
                      value={formData.custom_price}
                      onChange={(e) => setFormData({...formData, custom_price: Number(e.target.value)})}
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_recurring"
                    checked={formData.is_recurring}
                    onCheckedChange={(checked) => setFormData({...formData, is_recurring: !!checked})}
                  />
                  <Label htmlFor="is_recurring">Evento Recurrente</Label>
                </div>

                {formData.is_recurring && (
                  <div>
                    <Label>Días de la Semana</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={day.value}
                            checked={formData.recurrence_pattern.includes(day.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  recurrence_pattern: [...formData.recurrence_pattern, day.value]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  recurrence_pattern: formData.recurrence_pattern.filter(d => d !== day.value)
                                });
                              }
                            }}
                          />
                          <Label htmlFor={day.value}>{day.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Creando..." : "Crear Reserva"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreating(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Reservas Especiales Existentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {specialBookings?.map((booking) => (
              <div key={booking.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{booking.title}</h3>
                    <p className="text-sm text-gray-600">{booking.court.name} - {booking.event_type}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(booking.start_time), "dd/MM/yyyy HH:mm", { locale: es })} - 
                      {format(new Date(booking.end_time), "HH:mm", { locale: es })}
                    </p>
                    {booking.description && (
                      <p className="text-sm text-gray-600 mt-1">{booking.description}</p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteSpecialBooking(booking.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
