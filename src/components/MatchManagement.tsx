import { useAuth } from "@/components/AuthProvider";
import { useUserRole } from "@/hooks/use-user-role";
import { MatchHeader } from "./match/MatchHeader";
import { MatchList } from "./match/MatchList";
import { useMatches } from "@/hooks/use-matches";
import { useMatchActions } from "@/hooks/use-match-actions";

export function MatchManagement() {
  const { user } = useAuth();
  const { data: userRole } = useUserRole(user?.id);
  const isAdmin = userRole?.role === 'admin';
  
  const { data: matches, refetch: refetchMatches } = useMatches();
  const { 
    isLoading, 
    handleCreateMatch, 
    handleUpdateResult, 
    handleDeleteMatch 
  } = useMatchActions(refetchMatches);

  const onCreateMatch = (isDoubles: boolean = false, bookingId: string) => {
    handleCreateMatch(user?.id, isDoubles, bookingId);
  };

  return (
    <div className="space-y-6">
      <MatchHeader
        matchCount={matches?.length || 0}
        isLoading={isLoading}
        onCreateMatch={onCreateMatch}
      />
      <MatchList
        matches={matches}
        isAdmin={isAdmin}
        userId={user?.id}
        onUpdateResult={handleUpdateResult}
        onDeleteMatch={handleDeleteMatch}
      />
    </div>
  );
}

export default MatchManagement;