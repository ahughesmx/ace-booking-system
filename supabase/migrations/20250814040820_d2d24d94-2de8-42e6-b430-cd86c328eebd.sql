-- Enable realtime for bookings and special_bookings tables
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE special_bookings;

-- Enable replica identity for realtime changes
ALTER TABLE bookings REPLICA IDENTITY FULL;
ALTER TABLE special_bookings REPLICA IDENTITY FULL;