import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import BookingCalendar from "@/components/BookingCalendar";
import MatchManagement from "@/components/MatchManagement";
import RankingTable from "@/components/RankingTable";
import { useUserRole } from "@/hooks/use-user-role";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCircle2 } from "lucide-react";
import MainNav from "@/components/MainNav";
import { useLocation } from "react-router-dom";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: userRole } = useUserRole(user?.id);
  const defaultTab = location.state?.defaultTab || "bookings";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div>Cargando...</div>;
  }

  const renderContent = () => {
    switch (defaultTab) {
      case "bookings":
        return <BookingCalendar />;
      case "matches":
        return <MatchManagement />;
      case "ranking":
        return <RankingTable />;
      default:
        return <BookingCalendar />;
    }
  };

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
        
        <div className="mt-6 space-y-6 mx-auto max-w-4xl">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}