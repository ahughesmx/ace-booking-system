import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AdminButton } from "@/components/admin/AdminButton";
import { Plus, Edit, Trash2, Users, Clock, Calendar } from "lucide-react";
import { useCourses, useCreateCourse, useUpdateCourse, useDeleteCourse } from "@/hooks/use-courses";
import { useInstructors } from "@/hooks/use-instructors";
import { useCourseEnrollments } from "@/hooks/use-course-enrollments";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const SPORT_TYPES = [
  { value: "tennis", label: "Tenis" },
  { value: "padel", label: "Pádel" },
  { value: "swimming", label: "Natación" },
  { value: "fitness", label: "Fitness" },
  { value: "yoga", label: "Yoga" },
];

const LEVELS = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
  { value: "all", label: "Todos los niveles" },
];

const courseSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
  sport_type: z.string().min(1, "El tipo de deporte es requerido"),
  level: z.enum(["beginner", "intermediate", "advanced", "all"], {
    required_error: "El nivel es requerido",
  }),
  instructor_id: z.string().min(1, "El instructor es requerido"),
  max_participants: z.number().min(1, "Debe tener al menos 1 participante"),
  price_per_class: z.number().min(0, "El precio debe ser mayor o igual a 0"),
  total_classes: z.number().min(1, "Debe tener al menos 1 clase"),
  duration_minutes: z.number().min(15, "La duración mínima es 15 minutos"),
  requires_court: z.boolean(),
  court_type: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal("")),
});

type CourseFormData = z.infer<typeof courseSchema>;

export default function CourseManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const { data: courses, isLoading } = useCourses();
  const { data: instructors } = useInstructors();
  const { data: enrollments } = useCourseEnrollments(selectedCourseId || "");
  
  const createMutation = useCreateCourse();
  const updateMutation = useUpdateCourse();
  const deleteMutation = useDeleteCourse();

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      sport_type: "",
      level: "beginner",
      instructor_id: "",
      max_participants: 20,
      price_per_class: 0,
      total_classes: 1,
      duration_minutes: 90,
      requires_court: false,
      court_type: "",
      image_url: "",
    },
  });

  const onSubmit = (data: CourseFormData) => {
    // Ensure required fields are present
    const courseData = {
      ...data,
      sport_type: data.sport_type || "",
      level: data.level as "beginner" | "intermediate" | "advanced" | "all",
      title: data.title || "",
    };
    
    if (editingCourse) {
      updateMutation.mutate({ id: editingCourse.id, ...courseData }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingCourse(null);
          form.reset();
        }
      });
    } else {
      createMutation.mutate(courseData, {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset();
        }
      });
    }
  };

  const handleEdit = (course: any) => {
    setEditingCourse(course);
    form.reset({
      title: course.title,
      description: course.description || "",
      sport_type: course.sport_type,
      level: course.level,
      instructor_id: course.instructor_id || "",
      max_participants: course.max_participants,
      price_per_class: parseFloat(course.price_per_class),
      total_classes: course.total_classes,
      duration_minutes: course.duration_minutes,
      requires_court: course.requires_court,
      court_type: course.court_type || "",
      image_url: course.image_url || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (courseId: string) => {
    if (confirm("¿Estás seguro de que quieres desactivar este curso?")) {
      deleteMutation.mutate(courseId);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCourse(null);
    form.reset();
  };

  const getSportLabel = (sport: string) => {
    const found = SPORT_TYPES.find(s => s.value === sport);
    return found?.label || sport;
  };

  const getLevelLabel = (level: string) => {
    const found = LEVELS.find(l => l.value === level);
    return found?.label || level;
  };

  if (isLoading) {
    return <div>Cargando cursos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Cursos</h2>
          <p className="text-muted-foreground">
            Administra los cursos y clases del club
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogTrigger asChild>
            <AdminButton 
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                console.log("Course button clicked!");
                setIsDialogOpen(true);
              }}
            >
              Nuevo Curso
            </AdminButton>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCourse ? "Editar Curso" : "Crear Nuevo Curso"}
              </DialogTitle>
              <DialogDescription>
                Completa la información del curso
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Curso de Tenis Principiantes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sport_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deporte</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar deporte" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SPORT_TYPES.map((sport) => (
                              <SelectItem key={sport.value} value={sport.value}>
                                {sport.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción del curso..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nivel</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar nivel" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LEVELS.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instructor_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instructor</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar instructor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {instructors?.map((instructor) => (
                              <SelectItem key={instructor.id} value={instructor.id}>
                                {instructor.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="max_participants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Participantes</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price_per_class"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio por clase</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="total_classes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total clases</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duración (min)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="15"
                            step="15"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de Imagen (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://ejemplo.com/imagen.jpg"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) 
                      ? "Guardando..." 
                      : editingCourse ? "Actualizar" : "Crear"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de cursos */}
      <div className="grid gap-6">
        {courses?.map((course) => (
          <Card key={course.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {course.title}
                    <Badge variant="outline">{getSportLabel(course.sport_type)}</Badge>
                    <Badge variant="secondary">{getLevelLabel(course.level)}</Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {course.description}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <AdminButton
                    variant="outline"
                    size="sm"
                    icon={<Edit className="h-4 w-4" />}
                    onClick={() => handleEdit(course)}
                  >
                    Editar
                  </AdminButton>
                  <AdminButton
                    variant="destructive"
                    size="sm"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => handleDelete(course.id)}
                  >
                    Desactivar
                  </AdminButton>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Máx. {course.max_participants} participantes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{course.duration_minutes} minutos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{course.total_classes} clases</span>
                </div>
                <div className="text-lg font-bold text-primary">
                  ${course.price_per_class} por clase
                </div>
              </div>
              
              {course.instructor && (
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <span className="font-medium">Instructor:</span>
                  <span>{course.instructor.full_name}</span>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setSelectedCourseId(
                  selectedCourseId === course.id ? null : course.id
                )}
              >
                {selectedCourseId === course.id ? "Ocultar" : "Ver"} Inscripciones
              </Button>

              {selectedCourseId === course.id && enrollments && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">
                    Inscritos ({enrollments.length}/{course.max_participants})
                  </h4>
                  <div className="space-y-2">
                    {enrollments.map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center justify-between text-sm">
                        <span>Usuario inscrito</span>
                        <Badge variant={
                          enrollment.payment_status === "paid" ? "default" : 
                          enrollment.payment_status === "pending" ? "secondary" : "destructive"
                        }>
                          {enrollment.payment_status === "paid" ? "Pagado" :
                           enrollment.payment_status === "pending" ? "Pendiente" : "No pagado"}
                        </Badge>
                      </div>
                    ))}
                    {enrollments.length === 0 && (
                      <p className="text-muted-foreground text-sm">No hay inscripciones</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {courses?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-medium mb-2">No hay cursos creados</h3>
            <p className="text-muted-foreground mb-4">
              Comienza creando tu primer curso
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}