export type Match = {
  id: string;
  booking_id: string;
  player1_id: string;
  player2_id: string;
  player1_sets: number;
  player2_sets: number;
  is_doubles: boolean;
  is_confirmed_player1: boolean;
  is_confirmed_player2: boolean;
  booking: {
    start_time: string;
    court: {
      name: string;
    };
  };
  player1: {
    full_name: string;
  };
  player2: {
    full_name: string;
  };
};