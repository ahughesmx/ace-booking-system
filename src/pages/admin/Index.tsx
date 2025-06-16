
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalRole } from "@/hooks/use-global-role";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import UserManagement from "@/components/admin/UserManagement";
import CourtManagement from "@/components/admin/CourtManagement";
import Statistics from "@/components/admin/Statistics";
import ValidMemberIdManagement from "@/components/admin/ValidMemberIdManagement";
import BookingRulesManagement from "@/components/admin/BookingRulesManagement";
import DisplayManagement from "@/components/admin/DisplayManagement";

const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useGlobalRole(user?.id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");

  console.log("AdminPage - Rendering with:", { user, userRole, authLoading, roleLoading });

  // Show loading state while checking authentication
  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Verificando permisos...</div>
      </div>
    );
  }

  // Redirect if no user
  if (!user) {
    console.log("AdminPage - No user found, redirecting to home");
    navigate("/");
    return null;
  }

  // Check admin role and redirect if not admin
  if (userRole && userRole.role !== "admin") {
    console.log("AdminPage - User is not admin, redirecting");
    toast({
      title: "Acceso denegado",
      description: "No tienes permisos para acceder al panel de control",
      variant: "destructive",
    });
    navigate("/");
    return null;
  }

  // If userRole is still loading and user exists, show loading
  if (!userRole && user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando panel de administración...</div>
      </div>
    );
  }

  const renderContent = () => {
    console.log("AdminPage - Rendering content for tab:", activeTab);
    
    switch (activeTab) {
      case "users":
        return <UserManagement />;
      case "courts":
        return <CourtManagement />;
      case "statistics":
        return <Statistics />;
      case "member-ids":
        return <ValidMemberIdManagement />;
      case "booking-rules":
        return <BookingRulesManagement />;
      case "display":
        return <DisplayManagement />;
      default:
        return <UserManagement />;
    }
  };

  console.log("AdminPage - Rendering AdminLayout");
  
  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  );
};

export default AdminPage;
