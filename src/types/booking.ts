
export interface BaseBooking {
  id: string;
  court_id: string;
  user_id: string | null;
  start_time: string;
  end_time: string;
  created_at: string;
  booking_made_at: string;
  user: {
    full_name: string;
    member_id: string;
  } | null;
  court: {
    id: string;
    name: string;
    court_type: string;
  };
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
