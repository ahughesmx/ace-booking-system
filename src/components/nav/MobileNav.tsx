import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { UserAvatar } from "./UserAvatar";
import { NavItems } from "./NavItems";

interface MobileNavProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  user: User | null;
  navigationItems: Array<{
    label: string;
    icon: any;
    onClick: () => void;
  }>;
  handleSignOut: () => Promise<void>;
  handleSignIn: () => void;
}

export const MobileNav = ({
  mobileOpen,
  setMobileOpen,
  user,
  navigationItems,
  handleSignOut,
  handleSignIn,
}: MobileNavProps) => {
  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6 text-[#1e3a8a]" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px]">
        {user && <UserAvatar user={user} />}
        <div className="flex flex-col space-y-4">
          <NavItems
            navigationItems={navigationItems}
            user={user}
            handleSignOut={handleSignOut}
            handleSignIn={handleSignIn}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};