export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      booking_rules: {
        Row: {
          allow_consecutive_bookings: boolean
          court_type: string
          created_at: string | null
          id: string
          max_active_bookings: number
          max_days_ahead: number
          min_cancellation_time: unknown
          time_between_bookings: unknown
          updated_at: string | null
        }
        Insert: {
          allow_consecutive_bookings?: boolean
          court_type: string
          created_at?: string | null
          id?: string
          max_active_bookings?: number
          max_days_ahead?: number
          min_cancellation_time?: unknown
          time_between_bookings?: unknown
          updated_at?: string | null
        }
        Update: {
          allow_consecutive_bookings?: boolean
          court_type?: string
          created_at?: string | null
          id?: string
          max_active_bookings?: number
          max_days_ahead?: number
          min_cancellation_time?: unknown
          time_between_bookings?: unknown
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_made_at: string | null
          court_id: string | null
          created_at: string | null
          end_time: string
          id: string
          start_time: string
          user_id: string | null
        }
        Insert: {
          booking_made_at?: string | null
          court_id?: string | null
          created_at?: string | null
          end_time: string
          id?: string
          start_time: string
          user_id?: string | null
        }
        Update: {
          booking_made_at?: string | null
          court_id?: string | null
          created_at?: string | null
          end_time?: string
          id?: string
          start_time?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      court_type_settings: {
        Row: {
          advance_booking_days: number
          court_type: string
          created_at: string
          default_booking_duration: number
          id: string
          max_booking_duration: number
          max_capacity: number
          min_booking_duration: number
          operating_days: string[] | null
          operating_hours_end: string
          operating_hours_start: string
          peak_hours_end: string | null
          peak_hours_multiplier: number | null
          peak_hours_start: string | null
          price_per_hour: number
          updated_at: string
          weekend_price_multiplier: number | null
        }
        Insert: {
          advance_booking_days?: number
          court_type: string
          created_at?: string
          default_booking_duration?: number
          id?: string
          max_booking_duration?: number
          max_capacity?: number
          min_booking_duration?: number
          operating_days?: string[] | null
          operating_hours_end?: string
          operating_hours_start?: string
          peak_hours_end?: string | null
          peak_hours_multiplier?: number | null
          peak_hours_start?: string | null
          price_per_hour?: number
          updated_at?: string
          weekend_price_multiplier?: number | null
        }
        Update: {
          advance_booking_days?: number
          court_type?: string
          created_at?: string
          default_booking_duration?: number
          id?: string
          max_booking_duration?: number
          max_capacity?: number
          min_booking_duration?: number
          operating_days?: string[] | null
          operating_hours_end?: string
          operating_hours_start?: string
          peak_hours_end?: string | null
          peak_hours_multiplier?: number | null
          peak_hours_start?: string | null
          price_per_hour?: number
          updated_at?: string
          weekend_price_multiplier?: number | null
        }
        Relationships: []
      }
      courts: {
        Row: {
          court_type: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          court_type?: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          court_type?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      display_settings: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          rotation_interval: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          rotation_interval?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          rotation_interval?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      match_invitations: {
        Row: {
          created_at: string | null
          id: string
          match_id: string | null
          recipient_id: string | null
          sender_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id?: string | null
          recipient_id?: string | null
          sender_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string | null
          recipient_id?: string | null
          sender_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_invitations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_invitations_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_invitations_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string
          is_confirmed_player1: boolean | null
          is_confirmed_player2: boolean | null
          is_doubles: boolean | null
          player1_id: string | null
          player1_partner_id: string | null
          player1_sets: number | null
          player2_id: string | null
          player2_partner_id: string | null
          player2_sets: number | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          is_confirmed_player1?: boolean | null
          is_confirmed_player2?: boolean | null
          is_doubles?: boolean | null
          player1_id?: string | null
          player1_partner_id?: string | null
          player1_sets?: number | null
          player2_id?: string | null
          player2_partner_id?: string | null
          player2_sets?: number | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          is_confirmed_player1?: boolean | null
          is_confirmed_player2?: boolean | null
          is_doubles?: boolean | null
          player1_id?: string | null
          player1_partner_id?: string | null
          player1_sets?: number | null
          player2_id?: string | null
          player2_partner_id?: string | null
          player2_sets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player1_id_fkey_profiles"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player1_partner_id_fkey_profiles"
            columns: ["player1_partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player2_id_fkey_profiles"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player2_partner_id_fkey_profiles"
            columns: ["player2_partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_bookings: number | null
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          member_id: string | null
          phone: string | null
        }
        Insert: {
          active_bookings?: number | null
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          member_id?: string | null
          phone?: string | null
        }
        Update: {
          active_bookings?: number | null
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          member_id?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      rankings: {
        Row: {
          created_at: string | null
          id: string
          losses: number | null
          points: number | null
          updated_at: string | null
          user_id: string | null
          wins: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          losses?: number | null
          points?: number | null
          updated_at?: string | null
          user_id?: string | null
          wins?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          losses?: number | null
          points?: number | null
          updated_at?: string | null
          user_id?: string | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rankings_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      valid_member_ids: {
        Row: {
          created_at: string | null
          id: string
          member_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          member_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      recalculate_active_bookings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      user_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "user"],
    },
  },
} as const
