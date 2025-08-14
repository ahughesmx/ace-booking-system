import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface InterfacePreference {
  id: string;
  feature_key: string;
  display_name: string;
  description?: string;
  category: string;
  is_enabled: boolean;
}

export const useInterfacePreferences = () => {
  return useQuery({
    queryKey: ["interface-preferences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interface_preferences")
        .select("*");

      if (error) throw error;
      return data as InterfacePreference[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const useMenuPreferences = () => {
  const { data: preferences, ...rest } = useInterfacePreferences();
  
  const menuPreferences = preferences?.filter(p => p.category === 'menu') || [];
  
  return {
    ...rest,
    preferences: menuPreferences,
    isMenuItemEnabled: (featureKey: string) => {
      const preference = menuPreferences.find(p => p.feature_key === featureKey);
      return preference?.is_enabled ?? true; // Por defecto habilitado si no existe
    }
  };
};

export const useHomeCardPreferences = () => {
  const { data: preferences, ...rest } = useInterfacePreferences();
  
  const homeCardPreferences = preferences?.filter(p => p.category === 'home_cards') || [];
  
  return {
    ...rest,
    preferences: homeCardPreferences,
    isCardEnabled: (featureKey: string) => {
      const preference = homeCardPreferences.find(p => p.feature_key === featureKey);
      return preference?.is_enabled ?? true; // Por defecto habilitado si no existe
    }
  };
};