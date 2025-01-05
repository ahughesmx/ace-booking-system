import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BookingCalendar from "@/components/BookingCalendar";
import MatchManagement from "@/components/MatchManagement";
import RankingTable from "@/components/RankingTable";
import { useUserRole } from "@/hooks/use-user-role";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCircle2 } from "lucide-react";
import MainNav from "@/components/MainNav";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: userRole } = useUserRole(user?.id);
  const [activeTab, setActiveTab] = useState(location.state?.defaultTab || "bookings");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (location.state?.defaultTab) {
      setActiveTab(location.state.defaultTab);
    }
  }, [location.state?.defaultTab]);

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="container mx-auto px-4 py-6 md:py-8">
        {userRole?.role === 'admin' && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <UserCircle2 className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-blue-700">
              Acceso de administrador activado
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full grid grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="bookings">Reservas</TabsTrigger>
            <TabsTrigger value="matches">Partidos</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            <TabsContent value="bookings" className="space-y-6 mx-auto max-w-4xl">
              <BookingCalendar />
            </TabsContent>
            <TabsContent value="matches" className="space-y-6 mx-auto max-w-4xl">
              <MatchManagement />
            </TabsContent>
            <TabsContent value="ranking" className="space-y-6 mx-auto max-w-4xl">
              <RankingTable />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}