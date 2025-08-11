import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminButton } from "@/components/admin/AdminButton";
import { Plus, Calendar, Clock, Users, MapPin, Edit, Ban, UserCheck } from "lucide-react";
import { useClasses, useCreateClass, useUpdateClass, useCancelClass } from "@/hooks/use-classes";
import { useCourses } from "@/hooks/use-courses";
import { useCourts } from "@/hooks/use-courts";
import { useCourseEnrollments } from "@/hooks/use-course-enrollments";
import { useClassAttendance, useMarkAttendance } from "@/hooks/use-class-attendance";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as z from "zod";

const classSchema = z.object({
  course_id: z.string().min(1, "El curso es requerido"),
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
  class_date: z.string().min(1, "La fecha es requerida"),
  start_time: z.string().min(1, "La hora de inicio es requerida"),
  end_time: z.string().min(1, "La hora de fin es requerida"),
  max_participants: z.number().min(1, "El máximo de participantes debe ser mayor a 0"),
  court_id: z.string().optional(),
});

type ClassFormData = z.infer<typeof classSchema>;

export default function ClassManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("classes");

  const { data: classes, isLoading } = useClasses();
  const { data: courses } = useCourses();
  const { data: courts } = useCourts();
  const { data: enrollments } = useCourseEnrollments(selectedClassId);
  const { data: attendance } = useClassAttendance(selectedClassId);
  
  const createMutation = useCreateClass();
  const updateMutation = useUpdateClass();
  const cancelMutation = useCancelClass();
  const markAttendanceMutation = useMarkAttendance();

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      course_id: "",
      title: "",
      description: "",
      class_date: "",
      start_time: "",
      end_time: "",
      max_participants: 20,
      court_id: "no-court",
    },
  });

  const onSubmit = (data: ClassFormData) => {
    const classData = {
      course_id: data.course_id,
      title: data.title,
      description: data.description || null,
      class_date: data.class_date,
      start_time: data.start_time,
      end_time: data.end_time,
      max_participants: Number(data.max_participants),
      court_id: data.court_id === "no-court" ? null : data.court_id || null,
    };

    if (editingClass) {
      updateMutation.mutate({ id: editingClass.id, ...classData }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingClass(null);
          form.reset();
        }
      });
    } else {
      createMutation.mutate(classData, {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset();
        }
      });
    }
  };

  const handleEdit = (classItem: any) => {
    setEditingClass(classItem);
    form.reset({
      course_id: classItem.course_id,
      title: classItem.title,
      description: classItem.description || "",
      class_date: classItem.class_date,
      start_time: classItem.start_time,
      end_time: classItem.end_time,
      max_participants: classItem.max_participants,
      court_id: classItem.court_id || "no-court",
    });
    setIsDialogOpen(true);
  };

  const handleCancel = (classId: string, reason: string) => {
    cancelMutation.mutate({ id: classId, reason });
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingClass(null);
    form.reset();
  };

  const handleMarkAttendance = (userId: string, enrollmentId: string, attended: boolean) => {
    markAttendanceMutation.mutate({
      classId: selectedClassId,
      enrollmentId,
      userId,
      attended,
    });
  };

  if (isLoading) {
    return <div>Cargando clases...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Clases</h2>
          <p className="text-muted-foreground">
            Administra las clases individuales de los cursos
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogTrigger asChild>
            <AdminButton 
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                console.log("Class button clicked!");
                setIsDialogOpen(true);
              }}
            >
              Nueva Clase
            </AdminButton>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClass ? "Editar Clase" : "Crear Nueva Clase"}
              </DialogTitle>
              <DialogDescription>
                Completa la información de la clase
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="course_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Curso</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar curso" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {courses?.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.title} - {course.sport_type}
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
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título de la clase</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Clase de tenis básico" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción de la clase..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="class_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora de inicio</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora de fin</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="max_participants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Máximo de participantes</FormLabel>
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
                    name="court_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cancha (opcional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar cancha" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="no-court">Sin cancha asignada</SelectItem>
                            {courts?.map((court) => (
                              <SelectItem key={court.id} value={court.id}>
                                {court.name} ({court.court_type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                      : editingClass ? "Actualizar" : "Crear"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="classes">Lista de Clases</TabsTrigger>
          <TabsTrigger value="attendance">Asistencia</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-4">
          {/* Lista de clases */}
          <div className="grid gap-4">
            {classes?.map((classItem) => (
              <Card key={classItem.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {classItem.title}
                        {classItem.is_cancelled && (
                          <Badge variant="destructive">Cancelada</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {classItem.course?.title} - {classItem.course?.sport_type}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <AdminButton
                        variant="outline"
                        size="sm"
                        icon={<UserCheck className="h-4 w-4" />}
                        onClick={() => {
                          setSelectedClassId(classItem.id);
                          setActiveTab("attendance");
                        }}
                      >
                        Asistencia
                      </AdminButton>
                      <AdminButton
                        variant="outline"
                        size="sm"
                        icon={<Edit className="h-4 w-4" />}
                        onClick={() => handleEdit(classItem)}
                      >
                        Editar
                      </AdminButton>
                      {!classItem.is_cancelled && (
                        <AdminButton
                          variant="outline"
                          size="sm"
                          icon={<Ban className="h-4 w-4" />}
                          onClick={() => handleCancel(classItem.id, "Cancelada por administrador")}
                        >
                          Cancelar
                        </AdminButton>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(classItem.class_date), "d MMM yyyy", { locale: es })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{classItem.start_time} - {classItem.end_time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{classItem.current_participants}/{classItem.max_participants}</span>
                    </div>
                    {classItem.court && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{classItem.court.name}</span>
                      </div>
                    )}
                  </div>
                  
                  {classItem.description && (
                    <p className="text-sm text-muted-foreground mt-3">{classItem.description}</p>
                  )}
                  
                  {classItem.is_cancelled && classItem.cancellation_reason && (
                    <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded">
                      <p className="text-sm text-destructive">
                        <strong>Motivo de cancelación:</strong> {classItem.cancellation_reason}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {classes?.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <h3 className="text-lg font-medium mb-2">No hay clases registradas</h3>
                <p className="text-muted-foreground mb-4">
                  Comienza creando tu primera clase
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          {selectedClassId ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">Registro de Asistencia</h3>
              {/* Attendance management UI would go here */}
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    Funcionalidad de asistencia en desarrollo
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  Selecciona una clase para gestionar la asistencia
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}