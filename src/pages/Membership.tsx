import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainNav from "@/components/MainNav";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Membership() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const {
    familyMembers,
    isLoading,
    error,
    memberInfo
  } = useFamilyMembers(user?.id);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Por favor inicia sesión para ver la información de membresía.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary">Membresía Familiar</h1>
          <p className="text-muted-foreground mt-2">
            Información de todos los miembros de la familia
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Cargando información de membresía...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-destructive">Error al cargar la información de membresía</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Member ID Card */}
            {memberInfo && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Users className="h-5 w-5" />
                    Clave de Socio: {memberInfo.member_id}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="text-sm">
                      {familyMembers?.length || 0} miembro(s) registrado(s)
                    </Badge>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      Registrado: {format(new Date(memberInfo.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Family Members List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Miembros de la Familia
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!familyMembers || familyMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No se encontraron miembros de la familia.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {familyMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {member.full_name
                                ? member.full_name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)
                                : "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-foreground">
                              {member.full_name || "Nombre no disponible"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Clave: {member.member_id}
                            </p>
                            {member.phone && (
                              <p className="text-sm text-muted-foreground">
                                Tel: {member.phone}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarDays className="h-4 w-4" />
                            <span>
                              {format(new Date(member.created_at), "dd/MM/yyyy", { locale: es })}
                            </span>
                          </div>
                          {member.id === user.id && (
                            <Badge variant="default" className="text-xs">
                              Tú
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}