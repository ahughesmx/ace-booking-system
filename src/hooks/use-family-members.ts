import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

interface FamilyMember {
  id: string;
  full_name: string | null;
  member_id: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  is_membership_holder: boolean;
}

interface MemberInfo {
  member_id: string;
  created_at: string;
}

export function useFamilyMembers(userId?: string) {
  const {
    data: familyMembers,
    isLoading,
    error,
  } = useQuery<FamilyMember[]>({
    queryKey: ["familyMembers", userId],
    queryFn: async () => {
      if (!userId) return [];

      // First get the current user's member_id
      const { data: currentUser, error: userError } = await supabase
        .from("profiles")
        .select("member_id")
        .eq("id", userId)
        .single();

      if (userError) throw userError;
      if (!currentUser?.member_id) return [];

      // Get all family members with the same member_id
      const { data: members, error: membersError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          member_id,
          avatar_url,
          phone,
          created_at,
          is_membership_holder
        `)
        .eq("member_id", currentUser.member_id)
        .order("created_at", { ascending: true });

      if (membersError) throw membersError;
      
      return members || [];
    },
    enabled: !!userId,
  });

  // Get member info (first created member info)
  const {
    data: memberInfo,
  } = useQuery<MemberInfo>({
    queryKey: ["memberInfo", userId],
    queryFn: async () => {
      if (!userId) return null;

      // Get the current user's member_id
      const { data: currentUser, error: userError } = await supabase
        .from("profiles")
        .select("member_id")
        .eq("id", userId)
        .single();

      if (userError) throw userError;
      if (!currentUser?.member_id) return null;

      // Get the earliest created member with this member_id (family creator)
      const { data: memberInfo, error: memberError } = await supabase
        .from("profiles")
        .select("member_id, created_at")
        .eq("member_id", currentUser.member_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (memberError) throw memberError;
      
      return memberInfo;
    },
    enabled: !!userId,
  });

  return {
    familyMembers,
    memberInfo,
    isLoading,
    error,
  };
}