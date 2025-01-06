export type MatchInvitation = {
  id: string;
  match_id: string | null;
  sender_id: string | null;
  recipient_id: string | null;
  status: 'pending' | 'accepted' | 'rejected' | null;
  created_at: string | null;
  updated_at: string | null;
};