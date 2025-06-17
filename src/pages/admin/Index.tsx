
import { useState } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import AdminLayout from "@/components/admin/AdminLayout";
import UserManagement from "@/components/admin/UserManagement";
import CourtManagement from "@/components/admin/CourtManagement";
import CourtTypeSettings from "@/components/admin/CourtTypeSettings";
import Statistics from "@/components/admin/Statistics";
import ValidMemberIdManagement from "@/components/admin/ValidMemberIdManagement";
import BookingRulesManagement from "@/components/admin/BookingRulesManagement";
import DisplayManagement from "@/components/admin/DisplayManagement";
import WebhookManagement from "@/components/admin/WebhookManagement";

const AdminPage = () => {
  const { isAdmin, isLoading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("users");

  const renderContent = () => {
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
      case "webhooks":
        return <WebhookManagement />;
      case "display":
        return <DisplayManagement />;
      default:
        return <UserManagement />;
    }
  };

  // Show loading while verifying admin access
  if (isLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Verificando permisos de administrador...</div>
      </div>
    );
  }

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  );
};

export default AdminPage;
