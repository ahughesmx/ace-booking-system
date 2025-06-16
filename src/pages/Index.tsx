
import { BookingCalendar } from "@/components/BookingCalendar";
import MainNav from "@/components/MainNav";

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <MainNav />
      <div className="container mx-auto pt-24 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          <BookingCalendar />
        </div>
      </div>
    </div>
  );
}
