import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@supabase/supabase-js";

interface UserAvatarProps {
  user: User;
}

export const UserAvatar = ({ user }: UserAvatarProps) => {
  return (
    <div className="flex flex-col items-center gap-4 mb-8 pt-4">
      <Avatar className="h-20 w-20">
        <AvatarFallback className="bg-[#1e3a8a] text-white text-xl">
          {user.email?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="text-center">
        <p className="font-medium text-lg">{user.email?.split('@')[0]}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
};