-- Add membership 10202 to valid member IDs
INSERT INTO public.valid_member_ids (member_id)
VALUES ('10202')
ON CONFLICT (member_id) DO NOTHING;
