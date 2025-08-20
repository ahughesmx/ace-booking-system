import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";
import { PaymentForm } from "./PaymentForm";

// Initialize Stripe
const stripePromise = loadStripe(
  "pk_test_51RsF4LJYO9TGGmGZnQKWVG48fPOlHrdaK6FJ1m5VAoNztk60O4q9bzMTuSEm6ZLksr4fAbRxF5ktqRRvYIQZ2aij00c5xghzBR"
);

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientSecret: string;
  bookingData: {
    date: Date;
    time: string;
    courtType: string;
    courtName: string;
    amount: number;
    selectedUserName?: string;
  };
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  clientSecret,
  bookingData,
  onSuccess,
  onError,
}: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [stripeError, setStripeError] = useState<string>("");

  // DEBUG: Log modal state
  console.log('💳 PaymentModal render:', {
    isOpen,
    clientSecret: clientSecret ? `${clientSecret.substring(0, 20)}...` : 'NONE',
    stripePromise: !!stripePromise
  });

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#0570de',
      colorBackground: '#ffffff',
      colorText: '#30313d',
      colorDanger: '#df1b41',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '2px',
      borderRadius: '4px',
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" hideCloseButton={isProcessing}>
        <DialogHeader>
          <DialogTitle>Completar Pago</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Booking Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Cancha:</span>
              <span className="font-medium">{bookingData.courtName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Fecha:</span>
              <span>{bookingData.date.toLocaleDateString('es-ES')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Hora:</span>
              <span>{bookingData.time}</span>
            </div>
            {bookingData.selectedUserName && (
              <div className="flex justify-between text-sm">
                <span>Para:</span>
                <span className="font-medium">{bookingData.selectedUserName}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total:</span>
              <span>${bookingData.amount}</span>
            </div>
          </div>

          {/* Stripe Elements */}
          {stripeError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{stripeError}</AlertDescription>
            </Alert>
          )}
          
          {clientSecret ? (
            <Elements options={options} stripe={stripePromise}>
              <PaymentForm
                clientSecret={clientSecret}
                onSuccess={onSuccess}
                onError={(error) => {
                  setStripeError(error);
                  onError(error);
                }}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
              />
            </Elements>
          ) : (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Preparando pago...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}