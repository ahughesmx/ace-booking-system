import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { AdminReports } from "./reports/AdminReports";

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface HourlyData {
  hour: string;
  [key: string]: number | string; // Allow dynamic court names as keys
}

export default function Statistics() {
  // Top 10 usuarios con más reservas
  const { data: topUsers, isLoading: loadingTopUsers } = useQuery({
    queryKey: ["top-users"],
    queryFn: async () => {
      // Fetch bookings from last 30 days
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("user_id")
        .gte("start_time", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (bookingsError) throw bookingsError;

      // Get unique user IDs
      const userIds = [...new Set(bookingsData.map(b => b.user_id).filter(Boolean))];

      // Fetch profiles for those users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Create a map of user_id to full_name
      const userMap = new Map(profilesData.map(p => [p.id, p.full_name]));

      // Count bookings per user
      const userBookings = bookingsData.reduce((acc: any, booking: any) => {
        const userName = userMap.get(booking.user_id) || 'Usuario Desconocido';
        acc[userName] = (acc[userName] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(userBookings)
        .map(([name, count]) => ({ name, reservas: count }))
        .sort((a: any, b: any) => b.reservas - a.reservas)
        .slice(0, 10);
    },
  });

  // Estado de reservas (últimos 30 días)
  const { data: bookingStatus, isLoading: loadingBookingStatus } = useQuery({
    queryKey: ["booking-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("status")
        .gte("start_time", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const statusCounts = data.reduce((acc: any, booking: any) => {
        const statusLabel = 
          booking.status === 'paid' ? 'Pagadas' :
          booking.status === 'cancelled' ? 'Canceladas' :
          booking.status === 'pending_payment' ? 'Pendientes de Pago' :
          booking.status;
        acc[statusLabel] = (acc[statusLabel] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value,
      }));
    },
  });

  // Frecuencia de reservas por usuario
  const { data: bookingFrequency, isLoading: loadingFrequency } = useQuery({
    queryKey: ["booking-frequency"],
    queryFn: async () => {
      // Fetch bookings from last 30 days
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("user_id, start_time")
        .gte("start_time", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order("start_time", { ascending: true });

      if (bookingsError) throw bookingsError;

      // Get unique user IDs
      const userIds = [...new Set(bookingsData.map(b => b.user_id).filter(Boolean))];

      // Fetch profiles for those users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Create a map of user_id to full_name
      const userMap = new Map(profilesData.map(p => [p.id, p.full_name]));

      const userFrequency: { [key: string]: { [key: string]: number } } = {};
      
      bookingsData.forEach((booking: any) => {
        const userName = userMap.get(booking.user_id) || 'Usuario Desconocido';
        const date = new Date(booking.start_time).toLocaleDateString();
        
        if (!userFrequency[userName]) {
          userFrequency[userName] = {};
        }
        userFrequency[userName][date] = (userFrequency[userName][date] || 0) + 1;
      });

      const frequencyData = Object.entries(userFrequency).map(([user, dates]) => ({
        user,
        frequency: Object.values(dates).reduce((sum, count) => sum + count, 0) / Object.keys(dates).length,
      }));

      return frequencyData.sort((a, b) => b.frequency - a.frequency).slice(0, 5);
    },
  });

  // Ocupación diaria/semanal/mensual
  const { data: occupancyData, isLoading: loadingOccupancy } = useQuery({
    queryKey: ["occupancy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("start_time")
        .gte("start_time", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const occupancy = data.reduce((acc: any, booking: any) => {
        const date = new Date(booking.start_time).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(occupancy).map(([date, count]) => ({
        fecha: date,
        ocupacion: count,
      }));
    },
  });

  // Horas pico vs valle
  const { data: peakHours, isLoading: loadingPeakHours } = useQuery({
    queryKey: ["peak-hours"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("start_time")
        .gte("start_time", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const hourlyData = data.reduce((acc: any, booking: any) => {
        const hour = new Date(booking.start_time).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(hourlyData)
        .map(([hour, count]) => ({
          hora: `${hour}:00`,
          reservas: count,
        }))
        .sort((a, b) => Number(b.reservas) - Number(a.reservas));
    },
  });

  const { data: courtDistribution, isLoading: loadingCourtDist } = useQuery({
    queryKey: ["court-distribution"],
    queryFn: async () => {
      // Fetch bookings from last 30 days
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("court_id")
        .gte("start_time", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (bookingsError) throw bookingsError;

      // Get unique court IDs
      const courtIds = [...new Set(bookingsData.map(b => b.court_id).filter(Boolean))];

      // Fetch courts
      const { data: courtsData, error: courtsError } = await supabase
        .from("courts")
        .select("id, name")
        .in("id", courtIds);

      if (courtsError) throw courtsError;

      // Create a map of court_id to name
      const courtMap = new Map(courtsData.map(c => [c.id, c.name]));

      const distribution = bookingsData.reduce((acc: any, booking: any) => {
        const courtName = courtMap.get(booking.court_id) || 'Desconocida';
        acc[courtName] = (acc[courtName] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(distribution).map(([name, value]) => ({
        name,
        value,
      }));
    },
  });

  // Ocupación por hora para cada cancha
  const { data: hourlyOccupation, isLoading: loadingHourly } = useQuery({
    queryKey: ["hourly-occupation"],
    queryFn: async () => {
      // Fetch bookings from last 7 days
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("start_time, court_id")
        .gte("start_time", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (bookingsError) throw bookingsError;

      // Get unique court IDs
      const courtIds = [...new Set(bookingsData.map(b => b.court_id).filter(Boolean))];

      // Fetch courts
      const { data: courtsData, error: courtsError } = await supabase
        .from("courts")
        .select("id, name")
        .in("id", courtIds);

      if (courtsError) throw courtsError;

      // Create a map of court_id to name
      const courtMap = new Map(courtsData.map(c => [c.id, c.name]));

      const hourlyData: { [hour: string]: { [court: string]: number } } = {};
      
      bookingsData.forEach((booking: any) => {
        const hour = new Date(booking.start_time).getHours();
        const courtName = courtMap.get(booking.court_id) || 'Desconocida';
        
        const hourKey = `${hour}:00`;
        if (!hourlyData[hourKey]) {
          hourlyData[hourKey] = {};
        }
        hourlyData[hourKey][courtName] = (hourlyData[hourKey][courtName] || 0) + 1;
      });

      const formattedData: HourlyData[] = Object.entries(hourlyData).map(([hour, courts]) => ({
        hour,
        ...courts
      }));

      return formattedData.sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
    },
  });

  // Tendencias mensuales
  const { data: monthlyTrends, isLoading: loadingMonthly } = useQuery({
    queryKey: ["monthly-trends"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("start_time")
        .gte("start_time", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const monthlyData = data.reduce((acc: any, booking: any) => {
        const month = new Date(booking.start_time).toLocaleString('default', { month: 'long' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(monthlyData).map(([month, count]) => ({
        month,
        reservas: count,
      }));
    },
  });

  // Comparativa por día de la semana
  const { data: weekdayComparison, isLoading: loadingWeekday } = useQuery({
    queryKey: ["weekday-comparison"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("start_time")
        .gte("start_time", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const weekdayData = data.reduce((acc: any, booking: any) => {
        const weekday = weekdays[new Date(booking.start_time).getDay()];
        acc[weekday] = (acc[weekday] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(weekdayData).map(([day, count]) => ({
        dia: day,
        reservas: count,
      }));
    },
  });

  // Horas populares (últimos 30 días)
  const { data: popularHours, isLoading: loadingPopular } = useQuery({
    queryKey: ["popular-hours"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("start_time")
        .gte("start_time", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const hourlyData = data.reduce((acc: any, booking: any) => {
        const hour = new Date(booking.start_time).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(hourlyData).map(([hour, count]) => ({
        hora: `${hour}:00`,
        reservas: count,
      }));
    },
  });

  // Métodos de pago
  const { data: paymentMethods, isLoading: loadingPaymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("payment_method")
        .eq("status", "paid")
        .gte("start_time", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const methodCounts = data.reduce((acc: any, booking: any) => {
        const method = booking.payment_method || 'online';
        const methodName = method === 'online' ? 'En línea' : 
                          method === 'operador' ? 'Operador' : 
                          method === 'admin' ? 'Administrativo' : method;
        acc[methodName] = (acc[methodName] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(methodCounts).map(([name, value]) => ({
        name,
        value,
      }));
    },
  });

  // Ingresos por método de pago
  const { data: paymentRevenue, isLoading: loadingRevenue } = useQuery({
    queryKey: ["payment-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("payment_method, actual_amount_charged, amount")
        .eq("status", "paid")
        .gte("start_time", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const revenueByMethod = data.reduce((acc: any, booking: any) => {
        const method = booking.payment_method || 'online';
        const methodName = method === 'online' ? 'En línea' : 
                          method === 'operador' ? 'Operador' : 
                          method === 'admin' ? 'Administrativo' : method;
        const amount = booking.actual_amount_charged || booking.amount || 0;
        acc[methodName] = (acc[methodName] || 0) + Number(amount);
        return acc;
      }, {});

      return Object.entries(revenueByMethod).map(([method, revenue]) => ({
        method,
        revenue,
      }));
    },
  });

  return (
    <Tabs defaultValue="reports" className="space-y-6">
      <TabsList>
        <TabsTrigger value="reports">Reportes</TabsTrigger>
        <TabsTrigger value="statistics">Estadísticas</TabsTrigger>
      </TabsList>

      <TabsContent value="reports">
        <AdminReports />
      </TabsContent>

      <TabsContent value="statistics">
        <div className="grid gap-6 md:grid-cols-2">
      {/* Top 10 Usuarios */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Top 10 Usuarios con Más Reservas</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTopUsers ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Cargando datos...
            </div>
          ) : !topUsers || topUsers.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No hay datos disponibles para este período
            </div>
          ) : (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topUsers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="reservas" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estado de Reservas */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Reservas</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingBookingStatus ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Cargando datos...
            </div>
          ) : !bookingStatus || bookingStatus.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No hay datos disponibles
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bookingStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => {
                      const { name, percent } = entry;
                      return `${name} ${(percent * 100).toFixed(1)}%`;
                    }}
                  >
                    {bookingStatus?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Frecuencia de Reservas por Usuario */}
      <Card>
        <CardHeader>
          <CardTitle>Frecuencia de Reservas</CardTitle>
          <CardDescription>Top 5 usuarios más activos</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingFrequency ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Cargando datos...
            </div>
          ) : !bookingFrequency || bookingFrequency.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No hay datos disponibles
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingFrequency}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="user" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="frequency" fill="#10b981" name="Reservas por día" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ocupación Diaria */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Ocupación Diaria</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingOccupancy ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Cargando datos...
            </div>
          ) : !occupancyData || occupancyData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No hay datos disponibles
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={occupancyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="ocupacion" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Horas Pico vs Valle */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Horas Pico vs Valle</CardTitle>
          <CardDescription>Últimos 7 días</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPeakHours ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Cargando datos...
            </div>
          ) : !peakHours || peakHours.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No hay datos disponibles
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="reservas" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Distribución por Cancha</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCourtDist ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Cargando datos...
            </div>
          ) : !courtDistribution || courtDistribution.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No hay datos disponibles
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={courtDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {courtDistribution?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ocupación por Hora */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Ocupación por Hora</CardTitle>
          <CardDescription>Últimos 7 días</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHourly ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Cargando datos...
            </div>
          ) : !hourlyOccupation || hourlyOccupation.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No hay datos disponibles
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyOccupation}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {courtDistribution?.map((court: any, index: number) => (
                    <Bar 
                      key={court.name}
                      dataKey={court.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tendencias Mensuales */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Tendencias Mensuales</CardTitle>
          <CardDescription>Último año</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingMonthly ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Cargando datos...
            </div>
          ) : !monthlyTrends || monthlyTrends.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No hay datos disponibles
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="reservas" stroke="#4f46e5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparativa por Día de la Semana */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Reservas por Día</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingWeekday ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Cargando datos...
            </div>
          ) : !weekdayComparison || weekdayComparison.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No hay datos disponibles
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="reservas" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Horas Populares */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Horas Populares</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPopular ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Cargando datos...
            </div>
          ) : !popularHours || popularHours.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No hay datos disponibles
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={popularHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="reservas" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Métodos de Pago */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Métodos de Pago</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPaymentMethods ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Cargando datos...
            </div>
          ) : !paymentMethods || paymentMethods.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No hay datos disponibles
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethods}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={(entry) => {
                    const { name, percent } = entry;
                    return `${name} ${(percent * 100).toFixed(1)}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentMethods?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ingresos por Método de Pago */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Ingresos por Método</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRevenue ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Cargando datos...
            </div>
          ) : !paymentRevenue || paymentRevenue.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No hay datos disponibles
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="method" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Ingresos']} />
                  <Bar dataKey="revenue" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
