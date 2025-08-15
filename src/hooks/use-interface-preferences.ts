import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

interface InterfacePreference {
  id: string;
  feature_key: string;
  display_name: string;
  description?: string;
  category: string;
  is_enabled: boolean;
}

// Default preferences for when user is not authenticated or preferences don't exist
const getDefaultPreferences = (): InterfacePreference[] => [
  {
    id: "default-menu-matches",
    feature_key: "menu_matches",
    display_name: "Menú - Partidos",
    description: "Mostrar opción de Partidos en el menú",
    category: "menu",
    is_enabled: true,
  },
  {
    id: "default-menu-courses",
    feature_key: "menu_courses",
    display_name: "Menú - Cursos",
    description: "Mostrar opción de Cursos en el menú",
    category: "menu",
    is_enabled: true,
  },
  {
    id: "default-menu-ranking",
    feature_key: "menu_ranking",
    display_name: "Menú - Ranking",
    description: "Mostrar opción de Ranking en el menú",
    category: "menu",
    is_enabled: true,
  },
  {
    id: "default-home-matches",
    feature_key: "home_card_matches",
    display_name: "Card - Registra un partido",
    description: "Mostrar card 'Registra un partido' en la página principal",
    category: "home_cards",
    is_enabled: true,
  },
  {
    id: "default-home-courses",
    feature_key: "home_card_courses",
    display_name: "Card - Clases y cursos",
    description: "Mostrar card 'Clases y cursos' en la página principal",
    category: "home_cards",
    is_enabled: true,
  },
  {
    id: "default-home-competitions",
    feature_key: "home_card_competitions",
    display_name: "Card - Competencias",
    description: "Mostrar card 'Competencias' en la página principal",
    category: "home_cards",
    is_enabled: true,
  },
];

export const useInterfacePreferences = () => {
  return useQuery({
    queryKey: ["interface-preferences"],
    queryFn: async () => {
      console.log('🚀 Starting interface preferences fetch...');
      
      // Check authentication first
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Current user:', user?.id ? 'Authenticated' : 'Not authenticated', 'User ID:', user?.id);
      
      try {
        const { data, error } = await supabase
          .from("interface_preferences")
          .select("*");

        console.log('📊 Raw query result - data length:', data?.length, 'error:', error);

        // If there's an error or no data, return defaults
        if (error || !data || data.length === 0) {
          console.log("⚠️ Using default preferences:", error?.message || "No preferences found");
          return getDefaultPreferences();
        }
        
        console.log('✅ Using database preferences:', data);
        return data as InterfacePreference[];
      } catch (error) {
        console.warn("❌ Error fetching preferences, using defaults:", error);
        return getDefaultPreferences();
      }
    },
    staleTime: 0, // No cachear para debug
    gcTime: 0, // No mantener en cache para debug  
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: false, // Don't retry on auth errors
  });
};

export const useMenuPreferences = () => {
  const { data: preferences, isLoading, error } = useInterfacePreferences();
  
  const menuPreferences = preferences?.filter(p => p.category === 'menu') || [];
  
  return {
    isLoading,
    error,
    preferences: menuPreferences,
    isMenuItemEnabled: (featureKey: string) => {
      console.log('🔍 Menu - isLoading:', isLoading, 'featureKey:', featureKey);
      console.log('🔍 Menu - menuPreferences:', menuPreferences);
      if (isLoading) return true; // Show items while loading
      const preference = menuPreferences.find(p => p.feature_key === featureKey);
      console.log('🔍 Menu - found preference:', preference);
      const result = preference?.is_enabled ?? true;
      console.log('🔍 Menu - final result for', featureKey, ':', result);
      return result;
    }
  };
};

export const useHomeCardPreferences = () => {
  const { data: preferences, isLoading, error } = useInterfacePreferences();
  
  const homeCardPreferences = preferences?.filter(p => p.category === 'home_cards') || [];
  
  return {
    isLoading,
    error,
    preferences: homeCardPreferences,
    isCardEnabled: (featureKey: string) => {
      console.log('🏠 Cards - isLoading:', isLoading, 'featureKey:', featureKey);
      console.log('🏠 Cards - homeCardPreferences:', homeCardPreferences);
      if (isLoading) return true; // Show cards while loading
      const preference = homeCardPreferences.find(p => p.feature_key === featureKey);
      console.log('🏠 Cards - found preference:', preference);
      const result = preference?.is_enabled ?? true;
      console.log('🏠 Cards - final result for', featureKey, ':', result);
      return result;
    }
  };
};