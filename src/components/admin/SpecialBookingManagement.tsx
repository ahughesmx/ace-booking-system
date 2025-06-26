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
import { Plus, Calendar as CalendarIcon, Search } from "lucide-react";
import { format, addDays, getDay } from "date-fns";
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
  reference_user_id: string;
  court: {
    name: string;
    court_type: string;
  };
  reference_user?: {
    full_name: string;
    member_id: string;
  };
};

const DAYS_OF_WEEK = [
  { value: 'sunday', label: 'Domingo', dayIndex: 0 },
  { value: 'monday', label: 'Lunes', dayIndex: 1 },
  { value: 'tuesday', label: 'Martes', dayIndex: 2 },
  { value: 'wednesday', label: 'Miércoles', dayIndex: 3 },
  { value: 'thursday', label: 'Jueves', dayIndex: 4 },
  { value: 'friday', label: 'Viernes', dayIndex: 5 },
  { value: 'saturday', label: 'Sábado', dayIndex: 6 }
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

  // Form state with reference user
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
    recurrence_pattern: [] as string[],
    recurrence_weeks: 1,
    reference_user_id: '',
    reference_user_search: ''
  });

  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Queries
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

  // Updated query to only show non-expired special bookings
  const { data: specialBookings, refetch } = useQuery({
    queryKey: ["special-bookings"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("special_bookings")
        .select(`
          *,
          court:courts(name, court_type),
          reference_user:profiles!special_bookings_reference_user_id_fkey(full_name, member_id)
        `)
        .gte("end_time", now) // Only show non-expired bookings
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data as SpecialBooking[];
    },
  });

  const searchUsers = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setUserSuggestions([]);
      return;
    }

    try {
      setSearchingUsers(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, member_id")
        .or(`full_name.ilike.%${searchTerm}%,member_id.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setUserSuggestions(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearchingUsers(false);
    }
  };

  const generateRecurringDates = (startDate: Date, recurrencePattern: string[], weeks: number) => {
    const dates: Date[] = [];
    const startDayIndex = getDay(startDate); // Día de la semana de la fecha inicial
    
    console.log('🔄 Generando fechas recurrentes:', {
      startDate: startDate.toDateString(),
      startDayIndex,
      recurrencePattern,
      weeks
    });

    // Si es recurrencia simple (mismo día de la semana)
    if (recurrencePattern.length === 1) {
      const targetDayName = recurrencePattern[0];
      const targetDayIndex = DAYS_OF_WEEK.find(d => d.value === targetDayName)?.dayIndex ?? 0;
      
      // Si la fecha inicial coincide con el día objetivo, empezar desde ahí
      if (startDayIndex === targetDayIndex) {
        for (let week = 0; week < weeks; week++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + (week * 7));
          dates.push(date);
        }
      } else {
        // Calcular próxima ocurrencia del día objetivo
        let daysUntilTarget = targetDayIndex - startDayIndex;
        if (daysUntilTarget <= 0) daysUntilTarget += 7;
        
        for (let week = 0; week < weeks; week++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + daysUntilTarget + (week * 7));
          dates.push(date);
        }
      }
    } else {
      // Para múltiples días, generar para cada semana
      for (let week = 0; week < weeks; week++) {
        for (const dayName of recurrencePattern) {
          const dayIndex = DAYS_OF_WEEK.find(d => d.value === dayName)?.dayIndex ?? 0;
          const date = new Date(startDate);
          
          // Calcular días hasta el día objetivo en la semana actual + semanas adicionales
          const daysFromStart = (week * 7) + (dayIndex - startDayIndex);
          if (daysFromStart >= 0) { // Solo fechas futuras o actuales
            date.setDate(startDate.getDate() + daysFromStart);
            dates.push(date);
          }
        }
      }
    }

    const uniqueDates = dates
      .filter((date, index, self) => 
        self.findIndex(d => d.toDateString() === date.toDateString()) === index
      )
      .sort((a, b) => a.getTime() - b.getTime());

    console.log('✅ Fechas generadas:', uniqueDates.map(d => d.toDateString()));
    return uniqueDates;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.court_id || !formData.event_type || !formData.title || !formData.selected_date || 
        !formData.start_time || !formData.end_time || !formData.reference_user_id) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos, incluyendo el usuario de referencia",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      console.log('📝 Iniciando creación de reserva especial:', formData);

      const bookingsToCreate = [];

      if (formData.is_recurring && formData.recurrence_pattern.length > 0) {
        // Generar múltiples reservas para los días recurrentes
        const recurringDates = generateRecurringDates(
          formData.selected_date,
          formData.recurrence_pattern,
          formData.recurrence_weeks
        );

        console.log('🔄 Creando reservas recurrentes para', recurringDates.length, 'fechas');

        for (const date of recurringDates) {
          const startDateTime = new Date(date);
          const [startHour, startMinute] = formData.start_time.split(':').map(Number);
          startDateTime.setHours(startHour, startMinute, 0, 0);

          const endDateTime = new Date(date);
          const [endHour, endMinute] = formData.end_time.split(':').map(Number);
          endDateTime.setHours(endHour, endMinute, 0, 0);

          bookingsToCreate.push({
            court_id: formData.court_id,
            event_type: formData.event_type,
            title: formData.title,
            description: formData.description,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            price_type: formData.price_type,
            custom_price: formData.price_type === 'custom' ? formData.custom_price : null,
            is_recurring: true,
            recurrence_pattern: formData.recurrence_pattern,
            reference_user_id: formData.reference_user_id
          });
        }
      } else {
        // Crear una sola reserva
        const startDateTime = new Date(formData.selected_date);
        const [startHour, startMinute] = formData.start_time.split(':').map(Number);
        startDateTime.setHours(startHour, startMinute, 0, 0);

        const endDateTime = new Date(formData.selected_date);
        const [endHour, endMinute] = formData.end_time.split(':').map(Number);
        endDateTime.setHours(endHour, endMinute, 0, 0);

        bookingsToCreate.push({
          court_id: formData.court_id,
          event_type: formData.event_type,
          title: formData.title,
          description: formData.description,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          price_type: formData.price_type,
          custom_price: formData.price_type === 'custom' ? formData.custom_price : null,
          is_recurring: false,
          recurrence_pattern: null,
          reference_user_id: formData.reference_user_id
        });
      }

      console.log('💾 Insertando', bookingsToCreate.length, 'reservas:', bookingsToCreate);

      // Insertar todas las reservas
      const { error } = await supabase
        .from("special_bookings")
        .insert(bookingsToCreate);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: `${bookingsToCreate.length} reserva(s) especial(es) creada(s) correctamente`,
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
        recurrence_pattern: [],
        recurrence_weeks: 1,
        reference_user_id: '',
        reference_user_search: ''
      });
      setUserSuggestions([]);
      setIsCreating(false);
      refetch();
      
      // Invalidar queries relacionadas para actualizar Display
      queryClient.invalidateQueries({ queryKey: ["special-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    } catch (error) {
      console.error("❌ Error creating special booking:", error);
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
      
      // Invalidar queries para actualizar Display
      queryClient.invalidateQueries({ queryKey: ["special-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
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
                <Label htmlFor="reference_user">Usuario de Referencia *</Label>
                <div className="relative">
                  <Input
                    placeholder="Buscar por nombre o clave de socio..."
                    value={formData.reference_user_search}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({...formData, reference_user_search: value});
                      searchUsers(value);
                    }}
                  />
                  {userSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {userSuggestions.map((user) => (
                        <div
                          key={user.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setFormData({
                              ...formData, 
                              reference_user_id: user.id,
                              reference_user_search: `${user.full_name} (${user.member_id})`
                            });
                            setUserSuggestions([]);
                          }}
                        >
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-gray-500">Clave: {user.member_id}</div>
                        </div>
                      ))}
                    </div>
                  )}
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

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_recurring"
                    checked={formData.is_recurring}
                    onCheckedChange={(checked) => setFormData({...formData, is_recurring: !!checked})}
                  />
                  <Label htmlFor="is_recurring">Evento Recurrente</Label>
                </div>

                {formData.is_recurring && (
                  <div className="space-y-4">
                    <div>
                      <Label>Días de la Semana</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
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

                    <div>
                      <Label htmlFor="recurrence_weeks">Número de Semanas</Label>
                      <Input
                        id="recurrence_weeks"
                        type="number"
                        min="1"
                        max="12"
                        value={formData.recurrence_weeks}
                        onChange={(e) => setFormData({...formData, recurrence_weeks: Number(e.target.value)})}
                        placeholder="1"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Se crearán reservas para {formData.recurrence_weeks} semana(s)
                      </p>
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
          <CardTitle>Reservas Especiales Activas ({specialBookings?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {specialBookings?.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay reservas especiales activas</p>
            ) : (
              specialBookings?.map((booking) => (
                <div key={booking.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{booking.title}</h3>
                      <p className="text-sm text-gray-600">{booking.court.name} - {booking.event_type}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(booking.start_time), "dd/MM/yyyy HH:mm", { locale: es })} - 
                        {format(new Date(booking.end_time), "HH:mm", { locale: es })}
                      </p>
                      {booking.reference_user && (
                        <p className="text-sm text-blue-600">
                          Referencia: {booking.reference_user.full_name} ({booking.reference_user.member_id})
                        </p>
                      )}
                      {booking.description && (
                        <p className="text-sm text-gray-600 mt-1">{booking.description}</p>
                      )}
                      {booking.is_recurring && (
                        <p className="text-sm text-blue-600 mt-1">
                          Recurrente: {booking.recurrence_pattern?.join(', ')}
                        </p>
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
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
