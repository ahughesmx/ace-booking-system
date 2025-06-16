
import { useState, useEffect } from "react";
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
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [redirectReason, setRedirectReason] = useState("");

  console.log("AdminPage - Rendering with:", { user, userRole, authLoading, roleLoading });

  // Handle redirects in useEffect to avoid conditional returns before hooks
  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        console.log("AdminPage - No user found, will redirect to home");
        setShouldRedirect(true);
        setRedirectReason("no-user");
      } else if (userRole && userRole.role !== "admin") {
        console.log("AdminPage - User is not admin, will redirect");
        setShouldRedirect(true);
        setRedirectReason("not-admin");
      }
    }
  }, [user, userRole, authLoading, roleLoading]);

  // Execute redirects
  useEffect(() => {
    if (shouldRedirect) {
      if (redirectReason === "not-admin") {
        toast({
          title: "Acceso denegado",
          description: "No tienes permisos para acceder al panel de control",
          variant: "destructive",
        });
      }
      navigate("/");
    }
  }, [shouldRedirect, redirectReason, navigate, toast]);

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

  // Show loading state
  if (authLoading || roleLoading) {
    console.log("AdminPage - Loading state");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Verificando permisos...</div>
      </div>
    );
  }

  // Show loading while redirecting
  if (shouldRedirect) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">
          {redirectReason === "no-user" ? "Redirigiendo..." : "Acceso denegado..."}
        </div>
      </div>
    );
  }

  // Show loading if no role data yet
  if (!userRole && user) {
    console.log("AdminPage - No role data yet");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando panel de administración...</div>
      </div>
    );
  }

  // Only render admin layout if we have confirmed admin access
  if (user && userRole && userRole.role === "admin") {
    console.log("AdminPage - Rendering AdminLayout");
    
    return (
      <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderContent()}
      </AdminLayout>
    );
  }

  // Fallback loading state
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Cargando...</div>
    </div>
  );
};

export default AdminPage;
