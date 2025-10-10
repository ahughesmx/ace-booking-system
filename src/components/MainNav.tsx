import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Home, Calendar, Trophy, Settings, ClipboardList } from "lucide-react";
import { MatchInvitationNotification } from "./match/MatchInvitationNotification";
import { NavItems } from "./nav/NavItems";
import { MobileNav } from "./nav/MobileNav";
import { useGlobalRole } from "@/hooks/use-global-role";
import { useMenuPreferences } from "@/hooks/use-interface-preferences";

const MainNav = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useGlobalRole(user?.id);
  const { isMenuItemEnabled, isLoading: preferencesLoading } = useMenuPreferences();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    setMobileOpen(false);
    await signOut();
    navigate("/");
  };

  const handleSignIn = () => {
    setMobileOpen(false);
    navigate("/login");
  };

  const handleNavigation = (tab: string | null) => {
    setMobileOpen(false);
    console.log('MainNav - navigating to tab:', tab);
    
    // Forzar navegación limpia
    if (tab === null) {
      navigate("/", { replace: true });
    } else {
      navigate("/", { state: { defaultTab: tab }, replace: true });
    }
  };

  const handleAdminNavigation = () => {
    setMobileOpen(false);
    navigate("/admin");
  };

  console.log('🐛 MainNav - preferencesLoading:', preferencesLoading);
  console.log('🐛 MainNav - isMenuItemEnabled results:');
  console.log('  - menu_matches:', isMenuItemEnabled("menu_matches"));
  console.log('  - menu_courses:', isMenuItemEnabled("menu_courses"));
  console.log('  - menu_ranking:', isMenuItemEnabled("menu_ranking"));

  const navigationItems = [
    { label: "Inicio", icon: Home, onClick: () => handleNavigation(null) },
    { label: "Reservas", icon: Calendar, onClick: () => handleNavigation("bookings") },
    ...(isMenuItemEnabled("menu_matches") ? [{ label: "Partidos", icon: Calendar, onClick: () => handleNavigation("matches") }] : []),
    ...(isMenuItemEnabled("menu_courses") ? [{ label: "Cursos", icon: Calendar, onClick: () => navigate("/courses") }] : []),
    ...(isMenuItemEnabled("menu_ranking") ? [{ label: "Ranking", icon: Trophy, onClick: () => handleNavigation("ranking") }] : []),
  ];

  // Panel de Control para admins y supervisores
  if (user && !roleLoading && (userRole?.role === "admin" || userRole?.role === "supervisor")) {
    navigationItems.push({
      label: "Panel de Control",
      icon: Settings,
      onClick: handleAdminNavigation,
    });
  }

  // Panel de Operador para operadores
  if (user && !roleLoading && userRole?.role === "operador") {
    navigationItems.push({
      label: "Solicitudes",
      icon: ClipboardList,
      onClick: () => {
        setMobileOpen(false);
        navigate("/operator");
      },
    });
    navigationItems.push({
      label: "Reportes",
      icon: Trophy,
      onClick: () => {
        setMobileOpen(false);
        navigate("/operator/reports");
      },
    });
  }

  // Reportes para supervisores
  if (user && !roleLoading && userRole?.role === "supervisor") {
    navigationItems.push({
      label: "Reportes",
      icon: Trophy,
      onClick: () => {
        setMobileOpen(false);
        navigate("/operator/reports");
      },
    });
  }

  return (
    <nav className="w-full bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/lovable-uploads/93253d4c-3038-48af-a0cc-7e041b9226fc.png" 
              alt="CDV Logo" 
              className="h-12 w-12"
            />
            <span className="text-xl font-bold">CDV</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {user && <MatchInvitationNotification />}
            <NavItems
              navigationItems={navigationItems}
              user={user}
              handleSignOut={handleSignOut}
              handleSignIn={handleSignIn}
            />
          </div>

          {/* Mobile Navigation - Ahora siempre visible en móvil */}
          <div className="flex items-center gap-2 md:hidden">
            {user && <MatchInvitationNotification />}
            <MobileNav
              mobileOpen={mobileOpen}
              setMobileOpen={setMobileOpen}
              user={user}
              navigationItems={navigationItems}
              handleSignOut={handleSignOut}
              handleSignIn={handleSignIn}
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default MainNav;