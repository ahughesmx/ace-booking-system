import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Loader2 } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { useAuth } from "@/components/AuthProvider";

interface NavItemsProps {
  navigationItems: Array<{
    label: string;
    icon: any;
    onClick: () => void;
  }>;
  user: User | null;
  handleSignOut: () => Promise<void>;
  handleSignIn: () => void;
}

export const NavItems = ({ navigationItems, user, handleSignOut, handleSignIn }: NavItemsProps) => {
  const { isSigningOut } = useAuth();
  
  return (
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
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          <span>{isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}</span>
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
};