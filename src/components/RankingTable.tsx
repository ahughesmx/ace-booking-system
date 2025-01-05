import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RankingTable() {
  const { data: rankings, isLoading } = useQuery({
    queryKey: ["rankings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rankings")
        .select(`
          *,
          profiles:user_id (
            full_name
          )
        `)
        .order("points", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Cargando ranking...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking de Jugadores</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Posición</TableHead>
              <TableHead>Jugador</TableHead>
              <TableHead>Puntos</TableHead>
              <TableHead>Victorias</TableHead>
              <TableHead>Derrotas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankings?.map((ranking, index) => (
              <TableRow key={ranking.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{ranking.profiles?.full_name || "Jugador"}</TableCell>
                <TableCell>{ranking.points}</TableCell>
                <TableCell>{ranking.wins}</TableCell>
                <TableCell>{ranking.losses}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}