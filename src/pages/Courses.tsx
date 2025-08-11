import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Users, Trophy, Star, BookOpen } from "lucide-react";
import { useCourses } from "@/hooks/use-courses";
import { useInstructors } from "@/hooks/use-instructors";
import { useUserEnrollments } from "@/hooks/use-course-enrollments";
import { CourseCard } from "@/components/courses/CourseCard";
import { UserEnrollments } from "@/components/courses/UserEnrollments";
import { useAuth } from "@/components/AuthProvider";
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
  const [activeTab, setActiveTab] = useState("available");

  const { user } = useAuth();
  const { data: courses, isLoading } = useCourses(
    Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
  );
  const { data: instructors } = useInstructors();
  const { data: userEnrollments } = useUserEnrollments();

  // Get enrolled course IDs for filtering
  const enrolledCourseIds = userEnrollments?.map(e => e.course_id) || [];

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">Cursos Disponibles</TabsTrigger>
          <TabsTrigger value="enrolled" disabled={!user}>
            <BookOpen className="h-4 w-4 mr-2" />
            Mis Inscripciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-6">
          {/* Filtros */}
          <Card>
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
              <CourseCard
                key={course.id}
                course={course}
                isEnrolled={enrolledCourseIds.includes(course.id)}
              />
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
        </TabsContent>

        <TabsContent value="enrolled" className="space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Mis Inscripciones</h2>
            <p className="text-muted-foreground">
              Gestiona tus cursos inscritos y revisa tu progreso
            </p>
          </div>
          
          <UserEnrollments />
        </TabsContent>
      </Tabs>
    </div>
  );
}