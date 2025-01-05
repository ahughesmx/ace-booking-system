import { useAuth } from "@/components/AuthProvider";
import ProfileForm from "@/components/ProfileForm";
import BookingCalendar from "@/components/BookingCalendar";

export default function Index() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="container py-6 space-y-6">
      <ProfileForm userId={user.id} />
      <BookingCalendar />
    </div>
  );
}