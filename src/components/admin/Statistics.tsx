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
} from "recharts";

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Statistics() {
  // Estadísticas de reservas por día
  const { data: bookingStats } = useQuery({
    queryKey: ["booking-stats"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("bookings")
        .select("created_at, court_id, courts(name)")
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (error) throw error;

      const bookingsByDay = data.reduce((acc: any, booking: any) => {
        const date = new Date(booking.created_at).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(bookingsByDay).map(([date, count]) => ({
        date,
        reservas: count,
      }));
    },
  });

  // Estadísticas por cancha
  const { data: courtStats } = useQuery({
    queryKey: ["court-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("court_id, courts(name)");

      if (error) throw error;

      const courtBookings = data.reduce((acc: any, booking: any) => {
        const courtName = booking.courts?.name || 'Desconocida';
        acc[courtName] = (acc[courtName] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(courtBookings).map(([name, value]) => ({
        name,
        value,
      }));
    },
  });

  // Estadísticas por mes
  const { data: monthlyStats } = useQuery({
    queryKey: ["monthly-stats"],
    queryFn: async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data, error } = await supabase
        .from("bookings")
        .select("created_at")
        .gte("created_at", oneYearAgo.toISOString());

      if (error) throw error;

      const monthlyBookings = data.reduce((acc: any, booking: any) => {
        const month = new Date(booking.created_at).toLocaleString('default', { month: 'long' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(monthlyBookings).map(([month, count]) => ({
        month,
        reservas: count,
      }));
    },
  });

  // Estadísticas de usuarios
  const { data: userStats } = useQuery({
    queryKey: ["user-stats"],
    queryFn: async () => {
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact" });

      const { count: activeUsers } = await supabase
        .from("bookings")
        .select("user_id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      return {
        totalUsers,
        activeUsers,
      };
    },
  });

  // Estadísticas de anticipación de reservas
  const { data: bookingPatterns } = useQuery({
    queryKey: ["booking-patterns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("booking_made_at, start_time");

      if (error) throw error;

      const patterns = data.reduce((acc: any, booking: any) => {
        const hoursInAdvance = Math.round(
          (new Date(booking.start_time).getTime() - new Date(booking.booking_made_at).getTime()) 
          / (1000 * 60 * 60)
        );
        const category = 
          hoursInAdvance <= 24 ? "< 24h" :
          hoursInAdvance <= 48 ? "24-48h" :
          hoursInAdvance <= 72 ? "48-72h" : "> 72h";
        
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(patterns).map(([range, count]) => ({
        range,
        cantidad: count,
      }));
    },
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Estadísticas de Usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Estadísticas de Usuarios</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Usuarios totales</p>
              <p className="text-2xl font-bold">{userStats?.totalUsers || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Usuarios activos</p>
              <p className="text-2xl font-bold">{userStats?.activeUsers || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reservas por Cancha */}
      <Card>
        <CardHeader>
          <CardTitle>Reservas por Cancha</CardTitle>
          <CardDescription>Distribución total</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={courtStats}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {courtStats?.map((entry: any, index: number) => (
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

      {/* Reservas por Día */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Reservas por día</CardTitle>
          <CardDescription>Últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="reservas" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tendencia Mensual */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Tendencia Mensual</CardTitle>
          <CardDescription>Últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyStats}>
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

      {/* Patrones de Reserva */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Anticipación de Reservas</CardTitle>
          <CardDescription>Distribución por tiempo de anticipación</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bookingPatterns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="cantidad" fill="#4f46e5" stroke="#4f46e5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}