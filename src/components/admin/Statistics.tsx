import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  HeatMapChart,
} from "recharts";

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Statistics() {
  // Distribución de reservas por cancha
  const { data: courtDistribution } = useQuery({
    queryKey: ["court-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("court_id, courts(name)")
        .gte("start_time", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const distribution = data.reduce((acc: any, booking: any) => {
        const courtName = booking.courts?.name || 'Desconocida';
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
  const { data: hourlyOccupation } = useQuery({
    queryKey: ["hourly-occupation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("start_time, court_id, courts(name)")
        .gte("start_time", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const hourlyData = data.reduce((acc: any, booking: any) => {
        const hour = new Date(booking.start_time).getHours();
        const courtName = booking.courts?.name || 'Desconocida';
        
        if (!acc[hour]) {
          acc[hour] = {};
        }
        acc[hour][courtName] = (acc[hour][courtName] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(hourlyData).map(([hour, courts]) => ({
        hour: `${hour}:00`,
        ...courts,
      }));
    },
  });

  // Tendencias mensuales
  const { data: monthlyTrends } = useQuery({
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
  const { data: weekdayComparison } = useQuery({
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
  const { data: popularHours } = useQuery({
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

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Distribución de Reservas por Cancha */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Distribución por Cancha</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Ocupación por Hora */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Ocupación por Hora</CardTitle>
          <CardDescription>Últimos 7 días</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Tendencias Mensuales */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Tendencias Mensuales</CardTitle>
          <CardDescription>Último año</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Comparativa por Día de la Semana */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Reservas por Día</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Horas Populares */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Horas Populares</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}