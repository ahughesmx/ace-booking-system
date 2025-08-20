import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useToast } from "./use-toast";

export function useMembershipManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deactivateMemberMutation = useMutation({
    mutationFn: async ({ memberId, requestingUserId }: { memberId: string; requestingUserId: string }) => {
      const { data, error } = await supabase.rpc('deactivate_family_member', {
        p_member_id_to_deactivate: memberId,
        p_requesting_user_id: requestingUserId
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Miembro dado de baja",
        description: "El miembro ha sido eliminado de la membresía exitosamente.",
      });
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
    },
    onError: (error: any) => {
      console.error('Error deactivating member:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo dar de baja al miembro",
        variant: "destructive",
      });
    },
  });

  const updateMembershipHolderMutation = useMutation({
    mutationFn: async ({ newHolderId, currentMemberId }: { newHolderId: string; currentMemberId: string }) => {
      // Primero remover el titular actual
      const { error: removeError } = await supabase
        .from('profiles')
        .update({ is_membership_holder: false })
        .eq('member_id', currentMemberId)
        .eq('is_membership_holder', true);

      if (removeError) throw removeError;

      // Luego asignar el nuevo titular
      const { error: setError } = await supabase
        .from('profiles')
        .update({ is_membership_holder: true })
        .eq('id', newHolderId);

      if (setError) throw setError;
    },
    onSuccess: () => {
      toast({
        title: "Titular actualizado",
        description: "El titular de la membresía ha sido cambiado exitosamente.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
    },
    onError: (error: any) => {
      console.error('Error updating membership holder:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el titular de la membresía",
        variant: "destructive",
      });
    },
  });

  return {
    deactivateMember: deactivateMemberMutation.mutateAsync,
    updateMembershipHolder: updateMembershipHolderMutation.mutateAsync,
    isDeactivating: deactivateMemberMutation.isPending,
    isUpdatingHolder: updateMembershipHolderMutation.isPending,
  };
}