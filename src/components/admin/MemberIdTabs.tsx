import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ValidMemberIdManagement from "./ValidMemberIdManagement";
import UserRegistrationForm from "./UserRegistrationForm";
import { BulkMemberIdUpload } from "./BulkMemberIdUpload";
import { MemberIdFormatSettings } from "./MemberIdFormatSettings";
import { Settings, Upload, List, UserPlus } from "lucide-react";

export default function MemberIdTabs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de IDs de Miembros</h1>
        <p className="text-muted-foreground">
          Administra las claves de socio válidas y registra nuevos usuarios
        </p>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            Listado
          </TabsTrigger>
          <TabsTrigger value="bulk-upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Carga Masiva
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuración
          </TabsTrigger>
          <TabsTrigger value="register-user" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Registro Usuario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Listado de Claves de Socio</CardTitle>
              <CardDescription>
                Consulta, busca y gestiona las claves de socio válidas en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ValidMemberIdManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Carga Masiva de Claves</CardTitle>
              <CardDescription>
                Descarga la plantilla Excel y sube múltiples claves de socio de una vez
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkMemberIdUpload onSuccess={() => {}} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Formato</CardTitle>
              <CardDescription>
                Define las reglas de formato y validación para las claves de socio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MemberIdFormatSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register-user" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Nuevo Usuario</CardTitle>
              <CardDescription>
                Registra un nuevo usuario directamente desde el panel de administración
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserRegistrationForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}