import { Button } from "@/components/ui/button";

interface BookingButtonProps {
  isSubmitting: boolean;
  isDisabled: boolean;
  onClick: () => void;
  loginRedirect?: () => void;
  isAuthenticated: boolean;
}

export function BookingButton({ 
  isSubmitting, 
  isDisabled, 
  onClick, 
  loginRedirect,
  isAuthenticated 
}: BookingButtonProps) {
  if (!isAuthenticated && loginRedirect) {
    return (
      <Button
        className="w-full"
        onClick={loginRedirect}
      >
        Iniciar sesión para reservar
      </Button>
    );
  }

  return (
    <Button
      className="w-full"
      disabled={isDisabled || isSubmitting}
      onClick={onClick}
    >
      {isSubmitting ? "Procesando..." : "Continuar al pago"}
    </Button>
  );
}