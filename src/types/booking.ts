
export interface BaseBooking {
  id: string;
  court_id: string;
  user_id: string | null;
  start_time: string;
  end_time: string;
  created_at: string;
  booking_made_at: string;
  payment_method: string;
  actual_amount_charged: number | null;
  amount?: number;
  currency?: string;
  payment_id?: string | null;
  payment_gateway?: string | null;
  payment_completed_at?: string | null;
  expires_at?: string | null;
  status?: string;
  processed_by?: string | null;
  user: {
    full_name: string;
    member_id: string;
  } | null;
  court: {
    id: string;
    name: string;
    court_type: string;
  };
  processed_by_user?: {
    full_name: string;
  } | null;
}

export interface RegularBooking extends BaseBooking {
  isSpecial: false;
}

export interface SpecialBooking extends BaseBooking {
  isSpecial: true;
  event_type: string;
  title: string;
  description: string;
  reference_user_id: string | null;
}

export type Booking = RegularBooking | SpecialBooking;
