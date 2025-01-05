import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, Calendar, Trophy, LogOut } from "lucide-react";

const MainNav = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleNavigation = (tab: string) => {
    navigate("/", { state: { defaultTab: tab } });
    setMobileOpen(false);
  };

  const navigationItems = [
    { label: "Inicio", icon: Home, onClick: () => handleNavigation("bookings") },
    { label: "Reservas", icon: Calendar, onClick: () => handleNavigation("bookings") },
    { label: "Partidos", icon: Calendar, onClick: () => handleNavigation("matches") },
    { label: "Ranking", icon: Trophy, onClick: () => handleNavigation("ranking") },
  ];

  const NavItems = () => (
    <>
      {navigationItems.map((item) => (
        <Button
          key={item.label}
          variant="ghost"
          className="flex items-center gap-2"
          onClick={item.onClick}
        >
          <item.icon className="h-4 w-4" />
          <span>{item.label}</span>
        </Button>
      ))}
      <Button
        variant="ghost"
        className="flex items-center gap-2 text-red-500 hover:text-red-600"
        onClick={handleSignOut}
      >
        <LogOut className="h-4 w-4" />
        <span>Cerrar sesión</span>
      </Button>
    </>
  );

  return (
    <nav className="w-full bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="text-xl font-bold">ACE</div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <NavItems />
          </div>

          {/* Mobile Navigation */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <div className="flex flex-col space-y-4 mt-8">
                <NavItems />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default MainNav;