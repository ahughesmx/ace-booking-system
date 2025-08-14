-- Insert test valid member IDs to fix the empty table issue
INSERT INTO public.valid_member_ids (member_id) VALUES 
('cdv2025'),
('test123'),
('member001')
ON CONFLICT (member_id) DO NOTHING;