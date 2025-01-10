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
  const { user } = useAuth();
  const { data: userRole } = useGlobalRole(user?.id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    if (userRole && userRole.role !== "admin") {
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para acceder al panel de control",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [user, userRole, navigate, toast]);

  if (!user || (userRole && userRole.role !== "admin")) {
    return null;
  }

  const renderContent = () => {
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

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  );
};

export default AdminPage;