import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminButton } from "@/components/admin/AdminButton";
import { Plus, Edit, Trash2, Star, Phone, Mail } from "lucide-react";
import { useInstructors, useCreateInstructor, useUpdateInstructor } from "@/hooks/use-instructors";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const instructorSchema = z.object({
  full_name: z.string().min(1, "El nombre completo es requerido"),
  bio: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  experience_years: z.number().min(0, "Los años de experiencia deben ser mayor o igual a 0"),
  avatar_url: z.string().url().optional().or(z.literal("")),
  specialties: z.string().optional(),
  certifications: z.string().optional(),
});

type InstructorFormData = z.infer<typeof instructorSchema>;

export default function InstructorManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<any>(null);

  const { data: instructors, isLoading } = useInstructors();
  const createMutation = useCreateInstructor();
  const updateMutation = useUpdateInstructor();

  const form = useForm<InstructorFormData>({
    resolver: zodResolver(instructorSchema),
    defaultValues: {
      full_name: "",
      bio: "",
      email: "",
      phone: "",
      experience_years: 0,
      avatar_url: "",
      specialties: "",
      certifications: "",
    },
  });

  const onSubmit = (data: InstructorFormData) => {
    const instructorData = {
      ...data,
      full_name: data.full_name || "",
      specialties: data.specialties ? data.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
      certifications: data.certifications ? data.certifications.split(',').map(s => s.trim()).filter(Boolean) : [],
    };
    
    if (editingInstructor) {
      updateMutation.mutate({ id: editingInstructor.id, ...instructorData }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingInstructor(null);
          form.reset();
        }
      });
    } else {
      createMutation.mutate(instructorData, {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset();
        }
      });
    }
  };

  const handleEdit = (instructor: any) => {
    setEditingInstructor(instructor);
    form.reset({
      full_name: instructor.full_name,
      bio: instructor.bio || "",
      email: instructor.email || "",
      phone: instructor.phone || "",
      experience_years: instructor.experience_years || 0,
      avatar_url: instructor.avatar_url || "",
      specialties: instructor.specialties?.join(', ') || "",
      certifications: instructor.certifications?.join(', ') || "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingInstructor(null);
    form.reset();
  };

  if (isLoading) {
    return <div>Cargando instructores...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Instructores</h2>
          <p className="text-muted-foreground">
            Administra los instructores del club
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <AdminButton icon={<Plus className="h-4 w-4" />}>
              Nuevo Instructor
            </AdminButton>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInstructor ? "Editar Instructor" : "Crear Nuevo Instructor"}
              </DialogTitle>
              <DialogDescription>
                Completa la información del instructor
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Juan Pérez" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="experience_years"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Años de experiencia</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="instructor@ejemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Biografía</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe la experiencia y background del instructor..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialties"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especialidades (separadas por coma)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Tenis, Pádel, Fitness"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="certifications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificaciones (separadas por coma)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Certificado ATP, Entrenador Nacional"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="avatar_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de Foto (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://ejemplo.com/foto.jpg"
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
                      : editingInstructor ? "Actualizar" : "Crear"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de instructores */}
      <div className="grid gap-6">
        {instructors?.map((instructor) => (
          <Card key={instructor.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={instructor.avatar_url || undefined} />
                    <AvatarFallback className="text-lg">
                      {instructor.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {instructor.full_name}
                      {instructor.experience_years > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="h-4 w-4" />
                          {instructor.experience_years} años
                        </div>
                      )}
                    </CardTitle>
                    
                    {instructor.bio && (
                      <CardDescription className="mt-1 max-w-2xl">
                        {instructor.bio}
                      </CardDescription>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {instructor.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {instructor.email}
                        </div>
                      )}
                      {instructor.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {instructor.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <AdminButton
                    variant="outline"
                    size="sm"
                    icon={<Edit className="h-4 w-4" />}
                    onClick={() => handleEdit(instructor)}
                  >
                    Editar
                  </AdminButton>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {instructor.specialties && instructor.specialties.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Especialidades</h4>
                    <div className="flex flex-wrap gap-2">
                      {instructor.specialties.map((specialty, index) => (
                        <Badge key={index} variant="secondary">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {instructor.certifications && instructor.certifications.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Certificaciones</h4>
                    <div className="flex flex-wrap gap-2">
                      {instructor.certifications.map((cert, index) => (
                        <Badge key={index} variant="outline">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {instructors?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-medium mb-2">No hay instructores registrados</h3>
            <p className="text-muted-foreground mb-4">
              Comienza registrando tu primer instructor
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}