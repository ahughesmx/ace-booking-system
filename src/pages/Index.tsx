import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BookingCalendar from "@/components/BookingCalendar";
import MatchManagement from "@/components/MatchManagement";
import { useUserRole } from "@/hooks/use-user-role";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: userRole } = useUserRole(user?.id);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth/login");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="container py-8">
      {userRole?.role === 'admin' && (
        <div className="mb-4 p-4 bg-blue-100 rounded-lg">
          <p className="text-blue-800">
            Acceso de administrador activado
          </p>
        </div>
      )}
      <Tabs defaultValue="bookings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bookings">Reservas</TabsTrigger>
          <TabsTrigger value="matches">Partidos</TabsTrigger>
        </TabsList>
        <TabsContent value="bookings" className="space-y-4">
          <BookingCalendar />
        </TabsContent>
        <TabsContent value="matches" className="space-y-4">
          <MatchManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}