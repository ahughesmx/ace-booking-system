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
      label: "Membresía",
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
    <div className="flex justify-center items-center gap-8 py-6 mt-8">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <button
            key={index}
            onClick={action.onClick}
            className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-[#6898FE]/5 transition-all duration-200 hover-scale group"
          >
            <div className="w-12 h-12 bg-[#6898FE]/10 rounded-full flex items-center justify-center group-hover:bg-[#6898FE]/20 transition-colors">
              <Icon className="h-6 w-6 text-[#6898FE]" />
            </div>
            <span className="text-sm font-medium text-[#1e3a8a] text-center">
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}