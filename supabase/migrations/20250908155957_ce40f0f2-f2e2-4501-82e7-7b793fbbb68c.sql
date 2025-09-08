-- Agregar configuraciones de reagendamiento a booking_rules
ALTER TABLE booking_rules 
ADD COLUMN allow_rescheduling boolean NOT NULL DEFAULT true,
ADD COLUMN min_rescheduling_time interval NOT NULL DEFAULT '24:00:00'::interval;