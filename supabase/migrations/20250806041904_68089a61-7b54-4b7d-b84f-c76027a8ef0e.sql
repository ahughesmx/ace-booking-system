-- Ejecutar limpieza específica para el partido incompleto existente
DELETE FROM match_invitations 
WHERE match_id IN (
  SELECT m.id
  FROM matches m
  LEFT JOIN bookings b ON m.booking_id = b.id
  WHERE b.end_time < (now() - interval '5 hours')
    AND (
      (m.is_doubles = false AND m.player2_id IS NULL)
      OR
      (m.is_doubles = true AND (m.player1_partner_id IS NULL OR m.player2_partner_id IS NULL))
    )
);

DELETE FROM matches 
WHERE id IN (
  SELECT m.id
  FROM matches m
  LEFT JOIN bookings b ON m.booking_id = b.id
  WHERE b.end_time < (now() - interval '5 hours')
    AND (
      (m.is_doubles = false AND m.player2_id IS NULL)
      OR
      (m.is_doubles = true AND (m.player1_partner_id IS NULL OR m.player2_partner_id IS NULL))
    )
);