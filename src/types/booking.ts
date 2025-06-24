
export type RegularBooking = {
  id: string;
  court_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  court?: {
    name: string;
    court_type: string;
  };
  user?: {
    full_name: string;
    member_id?: string;
  };
  booking_made_at?: string;
  created_at?: string;
  isSpecial?: false;
};

export type SpecialBooking = {
  id: string;
  court_id: string;
  user_id: string | null;
  start_time: string;
  end_time: string;
  court?: {
    name: string;
    court_type: string;
  };
  user?: null;
  booking_made_at?: string;
  created_at?: string;
  isSpecial: true;
  event_type: string;
  title: string;
  description?: string;
};

export type Booking = RegularBooking | SpecialBooking;
