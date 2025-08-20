-- Update existing cash bookings to assign them to the first operator
WITH first_operator AS (
  SELECT ur.user_id 
  FROM user_roles ur 
  JOIN profiles p ON ur.user_id = p.id
  WHERE ur.role = 'operador' 
  ORDER BY ur.created_at ASC 
  LIMIT 1
)
UPDATE bookings 
SET processed_by = (SELECT user_id FROM first_operator)
WHERE payment_method IN ('efectivo', 'Cash', 'cash') 
  AND processed_by IS NULL
  AND (SELECT user_id FROM first_operator) IS NOT NULL;