export type MatchInvitation = {
  id: string;
  match_id: string | null;
  sender_id: string | null;
  recipient_id: string | null;
  status: 'pending' | 'accepted' | 'rejected' | null;
  created_at: string | null;
  updated_at: string | null;
  match?: {
    id: string;
    booking?: {
      start_time: string;
      court?: {
        name: string | null;
      } | null;
    } | null;
    player1?: {
      full_name: string | null;
    } | null;
    is_confirmed_player1: boolean | null;
    is_confirmed_player2: boolean | null;
  } | null;
};