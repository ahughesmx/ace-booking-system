import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, Calendar, Trophy, LogOut, LogIn } from "lucide-react";

const MainNav = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleSignIn = () => {
    navigate("/login");
  };

  const handleNavigation = (tab: string | null) => {
    if (window.innerWidth < 768) {
      setMobileOpen(false);
    }
    
    if (tab === null) {
      navigate("/", { state: undefined });
    } else {
      navigate("/", { state: { defaultTab: tab } });
    }
  };

  const navigationItems = [
    { label: "Inicio", icon: Home, onClick: () => handleNavigation(null) },
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
          className="flex w-full items-center justify-start gap-2"
          onClick={item.onClick}
        >
          <item.icon className="h-4 w-4 text-[#1e3a8a]" />
          <span>{item.label}</span>
        </Button>
      ))}
      {user ? (
        <Button
          variant="ghost"
          className="flex w-full items-center justify-start gap-2 text-red-500 hover:text-red-600"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesión</span>
        </Button>
      ) : (
        <Button
          variant="ghost"
          className="flex w-full items-center justify-start gap-2 text-blue-500 hover:text-blue-600"
          onClick={handleSignIn}
        >
          <LogIn className="h-4 w-4" />
          <span>Iniciar sesión</span>
        </Button>
      )}
    </>
  );

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
            <NavItems />
          </div>

          {/* Mobile Navigation */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6 text-[#1e3a8a]" />
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