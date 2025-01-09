import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Home, Calendar, Trophy, Settings } from "lucide-react";
import { MatchInvitationNotification } from "./match/MatchInvitationNotification";
import { NavItems } from "./nav/NavItems";
import { MobileNav } from "./nav/MobileNav";

const MainNav = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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
    
    if (tab === null) {
      navigate("/", { state: undefined });
    } else {
      navigate("/", { state: { defaultTab: tab } });
    }
  };

  const handleAdminNavigation = () => {
    setMobileOpen(false);
    navigate("/admin");
  };

  const navigationItems = [
    { label: "Inicio", icon: Home, onClick: () => handleNavigation(null) },
    { label: "Reservas", icon: Calendar, onClick: () => handleNavigation("bookings") },
    { label: "Partidos", icon: Calendar, onClick: () => handleNavigation("matches") },
    { label: "Ranking", icon: Trophy, onClick: () => handleNavigation("ranking") },
  ];

  // Añadir Panel de Control si el usuario está autenticado
  if (user) {
    navigationItems.push({
      label: "Panel de Control",
      icon: Settings,
      onClick: handleAdminNavigation,
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

          {/* Mobile Navigation */}
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