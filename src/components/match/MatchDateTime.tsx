import { Calendar, Clock } from "lucide-react";

type MatchDateTimeProps = {
  dateTime: string;
};

export function MatchDateTime({ dateTime }: MatchDateTimeProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };

  return (
    <>
      <div className="flex items-center text-sm text-muted-foreground">
        <Calendar className="h-4 w-4 mr-2" />
        <span>{formatDate(dateTime)}</span>
      </div>
      <div className="flex items-center text-sm text-muted-foreground">
        <Clock className="h-4 w-4 mr-2" />
        <span>{formatTime(dateTime)}</span>
      </div>
    </>
  );
}