
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalRole } from "@/hooks/use-global-role";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import UserManagement from "@/components/admin/UserManagement";
import CourtManagement from "@/components/admin/CourtManagement";
import CourtTypeSettings from "@/components/admin/CourtTypeSettings";
import Statistics from "@/components/admin/Statistics";
import ValidMemberIdManagement from "@/components/admin/ValidMemberIdManagement";
import BookingRulesManagement from "@/components/admin/BookingRulesManagement";
import DisplayManagement from "@/components/admin/DisplayManagement";
import { BookingAnalysis } from "@/components/BookingAnalysis";

const AdminPage = () => {
  // Todos los hooks se ejecutan siempre en el mismo orden
  const { user, loading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useGlobalRole(user?.id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");

  console.log("AdminPage - Rendering with:", { user, userRole, authLoading, roleLoading });

  // Efecto para manejar redirecciones
  useEffect(() => {
    if (authLoading || roleLoading) {
      // Aún cargando, no hacer nada
      return;
    }

    if (!user) {
      console.log("AdminPage - No user found, redirecting to login");
      navigate("/login");
      return;
    }

    if (!userRole) {
      console.log("AdminPage - No role found, redirecting to home");
      navigate("/");
      return;
    }

    if (userRole.role !== "admin") {
      console.log("AdminPage - User is not admin, redirecting");
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para acceder al panel de control",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
  }, [user, userRole, authLoading, roleLoading, navigate, toast]);

  const renderContent = () => {
    console.log("AdminPage - Rendering content for tab:", activeTab);
    
    switch (activeTab) {
      case "users":
        return <UserManagement />;
      case "courts":
        return <CourtManagement />;
      case "court-settings":
        return <CourtTypeSettings />;
      case "statistics":
        return <Statistics />;
      case "member-ids":
        return <ValidMemberIdManagement />;
      case "booking-rules":
        return <BookingRulesManagement />;
      case "display":
        return <DisplayManagement />;
      case "booking-analysis":
        return <BookingAnalysis />;
      default:
        return <UserManagement />;
    }
  };

  // Siempre mostrar loading mientras se cargan datos o se verifica acceso
  if (authLoading || roleLoading || !user || !userRole || userRole.role !== "admin") {
    const loadingMessage = authLoading || roleLoading 
      ? "Verificando permisos..." 
      : !user 
        ? "Redirigiendo al login..." 
        : !userRole 
          ? "Verificando rol..." 
          : "Acceso denegado...";

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{loadingMessage}</div>
      </div>
    );
  }

  // Solo renderizar si tenemos usuario admin confirmado
  console.log("AdminPage - Rendering AdminLayout");
  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  );
};

export default AdminPage;
