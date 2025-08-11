import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, BookOpen, UserCheck } from "lucide-react";
import InstructorManagement from "./academic/InstructorManagement";
import CourseManagement from "./academic/CourseManagement";  
import ClassManagement from "./academic/ClassManagement";

export default function AcademicManagement() {
  const [activeTab, setActiveTab] = useState("instructors");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gestión Académica</h2>
        <p className="text-muted-foreground">
          Administra instructores, cursos y clases de forma integrada
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="instructors" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Instructores
          </TabsTrigger>
          <TabsTrigger value="courses" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Cursos
          </TabsTrigger>
          <TabsTrigger value="classes" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Clases
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instructors" className="space-y-4">
          <InstructorManagement />
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <CourseManagement />
        </TabsContent>

        <TabsContent value="classes" className="space-y-4">
          <ClassManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}