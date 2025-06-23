
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
import SpecialBookingManagement from "@/components/admin/SpecialBookingManagement";
import UserRegistrationForm from "@/components/admin/UserRegistrationForm";

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
        return (
          <div className="space-y-6">
            <ValidMemberIdManagement />
            <UserRegistrationForm />
          </div>
        );
      case "booking-rules":
        return <BookingRulesManagement />;
      case "webhooks":
        return <WebhookManagement />;
      case "display":
        return <DisplayManagement />;
      case "special-bookings":
        return <SpecialBookingManagement />;
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
