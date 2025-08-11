import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, Users, Star, AlertTriangle } from "lucide-react";
import { useUserEnrollments, useCancelEnrollment } from "@/hooks/use-course-enrollments";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_LABELS = {
  active: "Activo",
  cancelled: "Cancelado",
  completed: "Completado",
  pending: "Pendiente",
};

const STATUS_VARIANTS = {
  active: "default",
  cancelled: "destructive",
  completed: "secondary",
  pending: "outline",
};

const SPORT_LABELS = {
  tennis: "Tenis",
  padel: "Pádel",
  swimming: "Natación",
  fitness: "Fitness",
  yoga: "Yoga",
};

export function UserEnrollments() {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { data: enrollments, isLoading } = useUserEnrollments();
  const cancelMutation = useCancelEnrollment();

  const handleCancelEnrollment = (enrollmentId: string) => {
    setCancellingId(enrollmentId);
  };

  const confirmCancel = () => {
    if (cancellingId) {
      cancelMutation.mutate(cancellingId, {
        onSuccess: () => {
          setCancellingId(null);
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!enrollments || enrollments.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <h3 className="text-lg font-medium mb-2">No tienes inscripciones</h3>
          <p className="text-muted-foreground mb-4">
            Explora nuestros cursos disponibles para comenzar tu entrenamiento
          </p>
          <Button onClick={() => window.location.href = "/courses"}>
            Ver cursos disponibles
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {enrollments.map((enrollment) => (
          <Card key={enrollment.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg">{enrollment.course?.title}</CardTitle>
                    <Badge variant={STATUS_VARIANTS[enrollment.status as keyof typeof STATUS_VARIANTS] as any}>
                      {STATUS_LABELS[enrollment.status as keyof typeof STATUS_LABELS]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">
                      {SPORT_LABELS[enrollment.course?.sport_type as keyof typeof SPORT_LABELS] || enrollment.course?.sport_type}
                    </Badge>
                    <Badge variant="secondary">
                      {enrollment.course?.level}
                    </Badge>
                  </div>
                  {enrollment.course?.description && (
                    <CardDescription className="line-clamp-2">
                      {enrollment.course.description}
                    </CardDescription>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">
                    ${enrollment.course?.price_per_class}
                  </div>
                  <div className="text-sm text-muted-foreground">por clase</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Instructor */}
              {enrollment.course?.instructor && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={enrollment.course.instructor.avatar_url || undefined} />
                    <AvatarFallback>
                      {enrollment.course.instructor.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{enrollment.course.instructor.full_name}</div>
                    {enrollment.course.instructor.experience_years && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {enrollment.course.instructor.experience_years} años de experiencia
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Enrollment Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Inscrito: {format(new Date(enrollment.enrollment_date), "d MMM yyyy", { locale: es })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{enrollment.course?.duration_minutes} min por clase</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{enrollment.course?.total_classes} clases totales</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Estado de pago:</span>
                  <Badge variant={enrollment.payment_status === "paid" ? "default" : "outline"}>
                    {enrollment.payment_status === "paid" ? "Pagado" : "Pendiente"}
                  </Badge>
                </div>
              </div>

              {enrollment.cancellation_date && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Cancelado</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Fecha de cancelación: {format(new Date(enrollment.cancellation_date), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                  </div>
                  {enrollment.cancellation_reason && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Motivo: {enrollment.cancellation_reason}
                    </div>
                  )}
                </div>
              )}

              {enrollment.status === "active" && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelEnrollment(enrollment.id)}
                  >
                    Cancelar inscripción
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancellingId} onOpenChange={() => setCancellingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar inscripción</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres cancelar tu inscripción a este curso? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancellingId(null)}>
              Mantener inscripción
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelando..." : "Confirmar cancelación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}