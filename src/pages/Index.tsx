
import { BookingCalendar } from "@/components/BookingCalendar";
import { MainNav } from "@/components/MainNav";
import { BookingAnalysis } from "@/components/BookingAnalysis";

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <MainNav />
      <div className="container mx-auto pt-24 pb-8 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6898FE] to-[#0FA0CE]">
              Sistema de Reservas
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Reserva tu cancha de tenis o pádel de manera fácil y rápida
            </p>
          </div>
          
          {/* Análisis temporal */}
          <BookingAnalysis />
          
          <BookingCalendar />
        </div>
      </div>
    </div>
  );
}
