-- Cancelar el mantenimiento con timezone incorrecto
UPDATE court_maintenance 
SET is_active = false
WHERE id = 'b2d3560b-3be4-4233-baf9-5178558cd72c';