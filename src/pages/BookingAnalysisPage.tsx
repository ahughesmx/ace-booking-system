
import { BookingAnalysis } from "@/components/BookingAnalysis";

export default function BookingAnalysisPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1e3a8a] mb-8">
          Análisis de Reservas
        </h1>
        <BookingAnalysis />
      </div>
    </div>
  );
}
