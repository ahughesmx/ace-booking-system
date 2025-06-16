
export type Booking = {
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
};
