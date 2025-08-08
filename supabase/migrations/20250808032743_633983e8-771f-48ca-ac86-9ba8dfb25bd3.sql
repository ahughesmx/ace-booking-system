-- Crear tabla de instructores
CREATE TABLE public.instructors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  bio TEXT,
  specialties TEXT[],
  avatar_url TEXT,
  phone TEXT,
  email TEXT,
  experience_years INTEGER DEFAULT 0,
  certifications TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de cursos
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  sport_type TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced', 'all')),
  instructor_id UUID REFERENCES public.instructors(id) ON DELETE SET NULL,
  max_participants INTEGER NOT NULL DEFAULT 20,
  price_per_class NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_classes INTEGER NOT NULL DEFAULT 1,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_court BOOLEAN NOT NULL DEFAULT false,
  court_type TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de clases individuales
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  class_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL,
  max_participants INTEGER NOT NULL,
  current_participants INTEGER NOT NULL DEFAULT 0,
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de inscripciones
CREATE TABLE public.course_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  cancellation_date TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  payment_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Crear tabla de asistencia a clases
CREATE TABLE public.class_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  attended BOOLEAN NOT NULL DEFAULT false,
  attendance_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, class_id)
);

-- Crear tabla de notificaciones de cursos
CREATE TABLE public.course_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('reminder', 'schedule_change', 'cancellation', 'spot_available', 'survey')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para instructors
CREATE POLICY "Anyone can view active instructors" ON public.instructors
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage instructors" ON public.instructors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Instructors can update their own profile" ON public.instructors
  FOR UPDATE USING (user_id = auth.uid());

-- Políticas para courses
CREATE POLICY "Anyone can view active courses" ON public.courses
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage courses" ON public.courses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para classes
CREATE POLICY "Anyone can view classes" ON public.classes
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage classes" ON public.classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para course_enrollments
CREATE POLICY "Users can view their own enrollments" ON public.course_enrollments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own enrollments" ON public.course_enrollments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own enrollments" ON public.course_enrollments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all enrollments" ON public.course_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all enrollments" ON public.course_enrollments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para class_attendance
CREATE POLICY "Users can view their own attendance" ON public.class_attendance
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all attendance" ON public.class_attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Instructors can view attendance for their classes" ON public.class_attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN courses co ON c.course_id = co.id
      JOIN instructors i ON co.instructor_id = i.id
      WHERE c.id = class_id AND i.user_id = auth.uid()
    )
  );

-- Políticas para course_notifications
CREATE POLICY "Users can view their own notifications" ON public.course_notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.course_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.course_notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Crear función para actualizar participants count
CREATE OR REPLACE FUNCTION update_class_participants_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE classes
  SET current_participants = (
    SELECT COUNT(*)
    FROM course_enrollments ce
    WHERE ce.course_id = (SELECT course_id FROM classes WHERE id = NEW.class_id)
      AND ce.status = 'active'
  )
  WHERE id = NEW.class_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar participants count
CREATE TRIGGER update_class_participants_trigger
  AFTER INSERT OR UPDATE OR DELETE ON course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_class_participants_count();

-- Crear función para timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para updated_at
CREATE TRIGGER update_instructors_updated_at
  BEFORE UPDATE ON public.instructors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_enrollments_updated_at
  BEFORE UPDATE ON public.course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_attendance_updated_at
  BEFORE UPDATE ON public.class_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();