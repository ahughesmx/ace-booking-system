import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Users, Trophy, Star } from "lucide-react";
import { useCourses } from "@/hooks/use-courses";
import { useInstructors } from "@/hooks/use-instructors";
import { useEnrollInCourse } from "@/hooks/use-course-enrollments";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const SPORT_TYPES = [
  { value: "tennis", label: "Tenis" },
  { value: "padel", label: "Pádel" },
  { value: "swimming", label: "Natación" },
  { value: "fitness", label: "Fitness" },
  { value: "yoga", label: "Yoga" },
];

const LEVELS = [
  { value: "all", label: "Todos los niveles" },
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
];

export default function Courses() {
  const [filters, setFilters] = useState({
    sport_type: "",
    level: "",
    instructor_id: "",
  });

  const { data: courses, isLoading } = useCourses(
    Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
  );
  const { data: instructors } = useInstructors();
  const enrollMutation = useEnrollInCourse();

  const handleEnroll = (courseId: string) => {
    enrollMutation.mutate(courseId);
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

  const getLevelLabel = (level: string) => {
    const found = LEVELS.find(l => l.value === level);
    return found?.label || level;
  };

  const getSportLabel = (sport: string) => {
    const found = SPORT_TYPES.find(s => s.value === sport);
    return found?.label || sport;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-t-lg"></div>
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Clases y Cursos</h1>
        <p className="text-muted-foreground">
          Descubre nuestra oferta de clases y cursos deportivos
        </p>
      </div>

      {/* Filtros */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Deporte</label>
              <Select
                value={filters.sport_type}
                onValueChange={(value) =>
                  setFilters(prev => ({ ...prev, sport_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar deporte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los deportes</SelectItem>
                  {SPORT_TYPES.map((sport) => (
                    <SelectItem key={sport.value} value={sport.value}>
                      {sport.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Nivel</label>
              <Select
                value={filters.level}
                onValueChange={(value) =>
                  setFilters(prev => ({ ...prev, level: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los niveles</SelectItem>
                  {LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Instructor</label>
              <Select
                value={filters.instructor_id}
                onValueChange={(value) =>
                  setFilters(prev => ({ ...prev, instructor_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar instructor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los instructores</SelectItem>
                  {instructors?.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.id}>
                      {instructor.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de cursos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses?.map((course) => (
          <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
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
                    <Badge variant="outline">{getSportLabel(course.sport_type)}</Badge>
                    <Badge variant={getLevelBadgeVariant(course.level)}>
                      {getLevelLabel(course.level)}
                    </Badge>
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
                  <span>{getLevelLabel(course.level)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => handleEnroll(course.id)}
                disabled={enrollMutation.isPending}
              >
                {enrollMutation.isPending ? "Inscribiendo..." : "Inscribirse"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {courses?.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">No se encontraron cursos</h3>
          <p className="text-muted-foreground">
            Intenta ajustar los filtros para ver más resultados
          </p>
        </div>
      )}
    </div>
  );
}