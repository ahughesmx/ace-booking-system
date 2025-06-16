import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCalendar } from "@/components/BookingCalendar";
import MainNav from "@/components/MainNav";
import { MatchManagement } from "@/components/MatchManagement";
import RankingTable from "@/components/RankingTable";

export default function Index() {
  const location = useLocation();
  const defaultTab = location.state?.defaultTab || "bookings";
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <MainNav />
      <div className="container mx-auto pt-24 pb-8 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6898FE] to-[#0FA0CE]">
              Club Deportivo Villamayor
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tu club de tenis y pádel - Reservas, partidos y ranking
            </p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm border border-[#6898FE]/20">
              <TabsTrigger 
                value="bookings" 
                className="data-[state=active]:bg-[#6898FE] data-[state=active]:text-white"
              >
                Reservas
              </TabsTrigger>
              <TabsTrigger 
                value="matches" 
                className="data-[state=active]:bg-[#6898FE] data-[state=active]:text-white"
              >
                Partidos
              </TabsTrigger>
              <TabsTrigger 
                value="ranking" 
                className="data-[state=active]:bg-[#6898FE] data-[state=active]:text-white"
              >
                Ranking
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="bookings" className="mt-8">
              <BookingCalendar />
            </TabsContent>
            
            <TabsContent value="matches" className="mt-8">
              <MatchManagement />
            </TabsContent>
            
            <TabsContent value="ranking" className="mt-8">
              <RankingTable />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
