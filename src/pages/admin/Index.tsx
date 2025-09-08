
import { useState } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import AdminLayout from "@/components/admin/AdminLayout";
import UserManagement from "@/components/admin/UserManagement";
import RegistrationRequests from "@/components/admin/RegistrationRequests";
import CourtManagement from "@/components/admin/CourtManagement";
import CourtTypeSettings from "@/components/admin/CourtTypeSettings";
import Statistics from "@/components/admin/Statistics";
import MemberIdTabs from "@/components/admin/MemberIdTabs";
import BookingRulesManagement from "@/components/admin/BookingRulesManagement";
import DisplayManagement from "@/components/admin/DisplayManagement";
import WebhookManagement from "@/components/admin/WebhookManagement";
import SpecialBookingManagement from "@/components/admin/SpecialBookingManagement";
import UserRegistrationForm from "@/components/admin/UserRegistrationForm";
import PaymentGatewaySettings from "@/components/admin/PaymentGatewaySettings";
import MatchManagementSettings from "@/components/admin/MatchManagementSettings";
import AcademicManagement from "@/components/admin/AcademicManagement";
import { ExpiredBookingsManager } from "@/components/admin/ExpiredBookingsManager";
import InterfacePreferencesManagement from "@/components/admin/InterfacePreferencesManagement";
import { LegalTextsManagement } from "@/components/admin/LegalTextsManagement";
import { ReschedulingRulesManagement } from "@/components/admin/ReschedulingRulesManagement";

const AdminPage = () => {
  const { isAdmin, isLoading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("users");

  const renderContent = () => {
    switch (activeTab) {
      case "users":
        return <UserManagement />;
      case "registration-requests":
        return <RegistrationRequests />;
      case "courts":
        return <CourtManagement />;
      case "court-settings":
        return <CourtTypeSettings />;
      case "statistics":
        return <Statistics />;
      case "member-ids":
        return <MemberIdTabs />;
      case "booking-rules":
        return <BookingRulesManagement />;
      case "rescheduling-rules":
        return <ReschedulingRulesManagement />;
      case "webhooks":
        return <WebhookManagement />;
      case "display":
        return <DisplayManagement />;
      case "special-bookings":
        return <SpecialBookingManagement />;
      case "payment-gateways":
        return <PaymentGatewaySettings />;
      case "matches":
        return <MatchManagementSettings />;
      case "academic":
        return <AcademicManagement />;
      case "expired-bookings":
        return <ExpiredBookingsManager />;
      case "interface-preferences":
        return <InterfacePreferencesManagement />;
      case "legal-texts":
        return <LegalTextsManagement />;
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
