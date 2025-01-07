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
import { Trophy, Medal, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type RankingWithProfile = {
  id: string;
  user_id: string | null;
  points: number | null;
  wins: number | null;
  losses: number | null;
  profiles: {
    full_name: string | null;
  } | null;
};

const RankingBadge = ({ position }: { position: number }) => {
  const getBadgeContent = () => {
    switch (position) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-700" />;
      default:
        return <span className="text-lg font-semibold text-gray-600">{position}</span>;
    }
  };

  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50">
      {getBadgeContent()}
    </div>
  );
};

export default function RankingTable() {
  const { data: rankings, isLoading } = useQuery({
    queryKey: ["rankings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rankings")
        .select(`
          id,
          user_id,
          points,
          wins,
          losses,
          profiles!rankings_user_id_fkey_profiles(
            full_name
          )
        `)
        .order("points", { ascending: false });

      if (error) {
        console.error("Error fetching rankings:", error);
        throw error;
      }

      return data as unknown as RankingWithProfile[];
    },
  });

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-blue-600" />
            Ranking de Jugadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6 text-blue-600" />
          Ranking de Jugadores
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="w-[100px] text-center">Posición</TableHead>
                <TableHead>Jugador</TableHead>
                <TableHead className="text-center">Puntos</TableHead>
                <TableHead className="text-center">Victorias</TableHead>
                <TableHead className="text-center">Derrotas</TableHead>
                <TableHead className="text-center">% Victoria</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings?.map((ranking, index) => {
                const totalMatches = (ranking.wins || 0) + (ranking.losses || 0);
                const winRate = totalMatches > 0
                  ? ((ranking.wins || 0) / totalMatches * 100).toFixed(1)
                  : "0.0";

                return (
                  <TableRow key={ranking.id} className="hover:bg-gray-50">
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <RankingBadge position={index + 1} />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {ranking.profiles?.full_name || "Jugador"}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {ranking.points}
                    </TableCell>
                    <TableCell className="text-center text-green-600">
                      {ranking.wins}
                    </TableCell>
                    <TableCell className="text-center text-red-600">
                      {ranking.losses}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {winRate}%
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {rankings?.map((ranking, index) => {
            const totalMatches = (ranking.wins || 0) + (ranking.losses || 0);
            const winRate = totalMatches > 0
              ? ((ranking.wins || 0) / totalMatches * 100).toFixed(1)
              : "0.0";

            return (
              <div
                key={ranking.id}
                className="bg-white rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RankingBadge position={index + 1} />
                    <span className="font-semibold">
                      {ranking.profiles?.full_name || "Jugador"}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {ranking.points} pts
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <div className="text-gray-500">Victorias</div>
                    <div className="font-semibold text-green-600">{ranking.wins}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500">Derrotas</div>
                    <div className="font-semibold text-red-600">{ranking.losses}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500">% Victoria</div>
                    <div className="font-semibold">{winRate}%</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}