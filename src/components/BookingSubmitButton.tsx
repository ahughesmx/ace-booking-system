import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";

interface BookingSubmitButtonProps {
  isSubmitting: boolean;
  isValid: boolean;
  onSubmit: () => void;
}

export function BookingSubmitButton({ isSubmitting, isValid, onSubmit }: BookingSubmitButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Button
        className="w-full"
        onClick={() => navigate('/login')}
      >
        Iniciar sesión para reservar
      </Button>
    );
  }

  return (
    <Button
      className="w-full"
      disabled={!isValid || isSubmitting}
      onClick={onSubmit}
    >
      {isSubmitting ? "Reservando..." : "Reservar cancha"}
    </Button>
  );
}