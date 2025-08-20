import { Calendar, CreditCard, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

type QuickAction = {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
};

interface HomeQuickActionsProps {
  onNavigateToBookings: () => void;
}

export function HomeQuickActions({ onNavigateToBookings }: HomeQuickActionsProps) {
  const navigate = useNavigate();
  const actions: QuickAction[] = [
    {
      icon: Calendar,
      label: "Mis reservaciones",
      onClick: onNavigateToBookings,
    },
    {
      icon: CreditCard,
      label: "Membresía familiar",
      onClick: () => navigate("/membership"),
    },
    {
      icon: Shield,
      label: "Aviso de privacidad",
      onClick: () => {
        // TODO: Implement privacy notice navigation
        console.log("Navigate to privacy notice");
      },
    },
  ];

  return (
    <div className="flex justify-center items-center gap-2 sm:gap-8 py-6 mt-8 px-4">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <button
            key={index}
            onClick={action.onClick}
            className="flex flex-col items-center gap-2 p-2 sm:p-4 rounded-lg hover:bg-[#6898FE]/5 transition-all duration-200 hover-scale group flex-1 max-w-[120px] sm:max-w-none sm:flex-none"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#6898FE]/10 rounded-full flex items-center justify-center group-hover:bg-[#6898FE]/20 transition-colors">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-[#6898FE]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[#1e3a8a] text-center leading-tight">
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}