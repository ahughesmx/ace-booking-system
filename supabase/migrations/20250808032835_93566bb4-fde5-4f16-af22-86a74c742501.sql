-- Actualizar funciones con search_path seguro
CREATE OR REPLACE FUNCTION public.update_class_participants_count()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  UPDATE public.classes
  SET current_participants = (
    SELECT COUNT(*)
    FROM public.course_enrollments ce
    WHERE ce.course_id = (SELECT course_id FROM public.classes WHERE id = NEW.class_id)
      AND ce.status = 'active'
  )
  WHERE id = NEW.class_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;