import { useState } from "react";
import { useSupervisorAuth } from "@/hooks/use-supervisor-auth";
import { SupervisorLayout } from "@/components/supervisor/SupervisorLayout";
import UserManagement from "@/components/admin/UserManagement";
import { SupervisorReports } from "@/components/supervisor/SupervisorReports";
import { SupervisorBookings } from "@/components/supervisor/SupervisorBookings";
import CourtManagement from "@/components/admin/CourtManagement";

const SupervisorPage = () => {
  const { isSupervisor, isLoading } = useSupervisorAuth();
  const [activeTab, setActiveTab] = useState("users");

  const renderContent = () => {
    switch (activeTab) {
      case "users":
        return <UserManagement />;
      case "bookings":
        return <SupervisorBookings />;
      case "courts":
        return <CourtManagement />;
      case "reports":
        return <SupervisorReports />;
      default:
        return <UserManagement />;
    }
  };

  // Show loading while verifying supervisor access
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Verificando permisos de supervisor...</div>
      </div>
    );
  }

  // The hook already handles redirects for unauthorized users
  // If we reach here and isSupervisor is true, show the interface
  if (!isSupervisor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Redirigiendo...</div>
      </div>
    );
  }

  return (
    <SupervisorLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </SupervisorLayout>
  );
};

export default SupervisorPage;
