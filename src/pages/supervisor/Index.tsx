import { useState } from "react";
import { useSupervisorAuth } from "@/hooks/use-supervisor-auth";
import { SupervisorLayout } from "@/components/supervisor/SupervisorLayout";
import UserManagement from "@/components/admin/UserManagement";
import { SupervisorReports } from "@/components/supervisor/SupervisorReports";

const SupervisorPage = () => {
  const { isSupervisor, isLoading } = useSupervisorAuth();
  const [activeTab, setActiveTab] = useState("users");

  const renderContent = () => {
    switch (activeTab) {
      case "users":
        return <UserManagement />;
      case "reports":
        return <SupervisorReports />;
      default:
        return <UserManagement />;
    }
  };

  // Show loading while verifying supervisor access
  if (isLoading || !isSupervisor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Verificando permisos de supervisor...</div>
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
