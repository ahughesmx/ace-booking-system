import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, Users, Trophy, Star, MapPin } from "lucide-react";
import { useEnrollInCourse } from "@/hooks/use-course-enrollments";
import { useAuth } from "@/components/AuthProvider";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Course {
  id: string;
  title: string;
  description?: string;
  sport_type: string;
  level: string;
  price_per_class: number;
  total_classes: number;
  duration_minutes: number;
  max_participants: number;
  image_url?: string;
  instructor?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    experience_years?: number;
    bio?: string;
    specialties?: string[];
    certifications?: string[];
  };
  classes?: Array<{
    id: string;
    title: string;
    class_date: string;
    start_time: string;
    end_time: string;
    current_participants: number;
    max_participants: number;
  }>;
}

interface CourseCardProps {
  course: Course;
  isEnrolled?: boolean;
  onEnroll?: (courseId: string) => void;
}

const SPORT_LABELS = {
  tennis: "Tenis",
  padel: "Pádel",
  swimming: "Natación",
  fitness: "Fitness",
  yoga: "Yoga",
};

const LEVEL_LABELS = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
  all: "Todos los niveles",
};

export function CourseCard({ course, isEnrolled = false, onEnroll }: CourseCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { user } = useAuth();
  const enrollMutation = useEnrollInCourse();

  const handleEnroll = () => {
    if (!user) {
      // Redirect to login or show login modal
      return;
    }
    
    if (onEnroll) {
      onEnroll(course.id);
    } else {
      enrollMutation.mutate(course.id);
    }
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case "beginner":
        return "default";
      case "intermediate":
        return "secondary";
      case "advanced":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowDetails(true)}>
        {course.image_url && (
          <div className="h-48 overflow-hidden">
            <img
              src={course.image_url}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2">{course.title}</CardTitle>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{SPORT_LABELS[course.sport_type as keyof typeof SPORT_LABELS] || course.sport_type}</Badge>
                <Badge variant={getLevelBadgeVariant(course.level)}>
                  {LEVEL_LABELS[course.level as keyof typeof LEVEL_LABELS] || course.level}
                </Badge>
                {isEnrolled && <Badge variant="default">Inscrito</Badge>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">
                ${course.price_per_class}
              </div>
              <div className="text-sm text-muted-foreground">por clase</div>
            </div>
          </div>
          
          {course.description && (
            <CardDescription className="line-clamp-2">
              {course.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Instructor */}
          {course.instructor && (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={course.instructor.avatar_url || undefined} />
                <AvatarFallback>
                  {course.instructor.full_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium text-sm">{course.instructor.full_name}</div>
                {course.instructor.experience_years && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {course.instructor.experience_years} años de experiencia
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detalles del curso */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{course.duration_minutes} min</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Máx. {course.max_participants}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{course.total_classes} clases</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span>{LEVEL_LABELS[course.level as keyof typeof LEVEL_LABELS] || course.level}</span>
            </div>
          </div>

          {!isEnrolled && (
            <Button
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                handleEnroll();
              }}
              disabled={enrollMutation.isPending}
            >
              {enrollMutation.isPending ? "Inscribiendo..." : "Inscribirse"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Detalles del curso modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{course.title}</DialogTitle>
            <DialogDescription>
              Información detallada del curso
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {course.image_url && (
              <div className="h-64 overflow-hidden rounded-lg">
                <img
                  src={course.image_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{SPORT_LABELS[course.sport_type as keyof typeof SPORT_LABELS] || course.sport_type}</Badge>
              <Badge variant={getLevelBadgeVariant(course.level)}>
                {LEVEL_LABELS[course.level as keyof typeof LEVEL_LABELS] || course.level}
              </Badge>
              {isEnrolled && <Badge variant="default">Inscrito</Badge>}
            </div>

            {course.description && (
              <div>
                <h3 className="font-semibold mb-2">Descripción</h3>
                <p className="text-muted-foreground">{course.description}</p>
              </div>
            )}

            {/* Instructor Info */}
            {course.instructor && (
              <div>
                <h3 className="font-semibold mb-3">Instructor</h3>
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={course.instructor.avatar_url || undefined} />
                    <AvatarFallback className="text-lg">
                      {course.instructor.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-medium text-lg">{course.instructor.full_name}</h4>
                    {course.instructor.experience_years && (
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                        <Star className="h-4 w-4" />
                        {course.instructor.experience_years} años de experiencia
                      </div>
                    )}
                    {course.instructor.bio && (
                      <p className="text-sm text-muted-foreground mb-3">{course.instructor.bio}</p>
                    )}
                    {course.instructor.specialties && course.instructor.specialties.length > 0 && (
                      <div className="mb-2">
                        <div className="text-sm font-medium mb-1">Especialidades:</div>
                        <div className="flex flex-wrap gap-1">
                          {course.instructor.specialties.map((specialty, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {course.instructor.certifications && course.instructor.certifications.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-1">Certificaciones:</div>
                        <div className="flex flex-wrap gap-1">
                          {course.instructor.certifications.map((cert, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Course Details */}
            <div>
              <h3 className="font-semibold mb-3">Detalles del curso</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Duración</div>
                    <div className="text-sm text-muted-foreground">{course.duration_minutes} minutos por clase</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Capacidad</div>
                    <div className="text-sm text-muted-foreground">Máximo {course.max_participants} participantes</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Total de clases</div>
                    <div className="text-sm text-muted-foreground">{course.total_classes} clases</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Nivel</div>
                    <div className="text-sm text-muted-foreground">{LEVEL_LABELS[course.level as keyof typeof LEVEL_LABELS] || course.level}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Classes Schedule */}
            {course.classes && course.classes.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Horario de clases</h3>
                <div className="space-y-2">
                  {course.classes.map((classItem) => (
                    <div key={classItem.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{classItem.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(classItem.class_date), "EEEE, d 'de' MMMM", { locale: es })} - {classItem.start_time} a {classItem.end_time}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {classItem.current_participants}/{classItem.max_participants} inscritos
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-lg">Precio</div>
                  <div className="text-sm text-muted-foreground">Por clase</div>
                </div>
                <div className="text-2xl font-bold text-primary">${course.price_per_class}</div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Total del curso: ${(course.price_per_class * course.total_classes).toFixed(2)}
              </div>
            </div>

            {!isEnrolled && (
              <Button
                className="w-full"
                size="lg"
                onClick={handleEnroll}
                disabled={enrollMutation.isPending}
              >
                {enrollMutation.isPending ? "Inscribiendo..." : "Inscribirse al curso"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}