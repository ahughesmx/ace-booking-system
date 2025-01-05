export type Match = {
  id: string;
  booking_id: string | null;
  player1_id: string | null;
  player2_id: string | null;
  player1_sets: number | null;
  player2_sets: number | null;
  is_doubles: boolean | null;
  is_confirmed_player1: boolean | null;
  is_confirmed_player2: boolean | null;
  created_at: string | null;
  player1_partner_id: string | null;
  player2_partner_id: string | null;
  booking?: {
    start_time: string;
    court?: {
      name: string;
    } | null;
  } | null;
  player1?: {
    full_name: string | null;
  } | null;
  player2?: {
    full_name: string | null;
  } | null;
};