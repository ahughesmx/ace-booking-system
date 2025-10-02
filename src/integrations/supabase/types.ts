export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      available_court_types: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_enabled: boolean
          type_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_enabled?: boolean
          type_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_enabled?: boolean
          type_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_reminder_settings: {
        Row: {
          created_at: string
          hours_before_booking: number
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          hours_before_booking?: number
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          hours_before_booking?: number
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      booking_rules: {
        Row: {
          allow_cancellation: boolean
          allow_consecutive_bookings: boolean
          allow_rescheduling: boolean
          court_type: string
          created_at: string | null
          id: string
          max_active_bookings: number
          max_days_ahead: number
          min_advance_booking_time: unknown
          min_cancellation_time: unknown
          min_rescheduling_time: unknown
          time_between_bookings: unknown
          updated_at: string | null
        }
        Insert: {
          allow_cancellation?: boolean
          allow_consecutive_bookings?: boolean
          allow_rescheduling?: boolean
          court_type: string
          created_at?: string | null
          id?: string
          max_active_bookings?: number
          max_days_ahead?: number
          min_advance_booking_time?: unknown
          min_cancellation_time?: unknown
          min_rescheduling_time?: unknown
          time_between_bookings?: unknown
          updated_at?: string | null
        }
        Update: {
          allow_cancellation?: boolean
          allow_consecutive_bookings?: boolean
          allow_rescheduling?: boolean
          court_type?: string
          created_at?: string | null
          id?: string
          max_active_bookings?: number
          max_days_ahead?: number
          min_advance_booking_time?: unknown
          min_cancellation_time?: unknown
          min_rescheduling_time?: unknown
          time_between_bookings?: unknown
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          actual_amount_charged: number | null
          amount: number | null
          booking_made_at: string | null
          court_id: string | null
          created_at: string | null
          currency: string | null
          end_time: string
          expires_at: string | null
          id: string
          payment_completed_at: string | null
          payment_gateway: string | null
          payment_id: string | null
          payment_method: string | null
          processed_by: string | null
          rules_accepted_at: string | null
          start_time: string
          status: string
          user_id: string | null
        }
        Insert: {
          actual_amount_charged?: number | null
          amount?: number | null
          booking_made_at?: string | null
          court_id?: string | null
          created_at?: string | null
          currency?: string | null
          end_time: string
          expires_at?: string | null
          id?: string
          payment_completed_at?: string | null
          payment_gateway?: string | null
          payment_id?: string | null
          payment_method?: string | null
          processed_by?: string | null
          rules_accepted_at?: string | null
          start_time: string
          status?: string
          user_id?: string | null
        }
        Update: {
          actual_amount_charged?: number | null
          amount?: number | null
          booking_made_at?: string | null
          court_id?: string | null
          created_at?: string | null
          currency?: string | null
          end_time?: string
          expires_at?: string | null
          id?: string
          payment_completed_at?: string | null
          payment_gateway?: string | null
          payment_id?: string | null
          payment_method?: string | null
          processed_by?: string | null
          rules_accepted_at?: string | null
          start_time?: string
          status?: string
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
            foreignKeyName: "bookings_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_attendance: {
        Row: {
          attendance_date: string | null
          attended: boolean
          class_id: string | null
          created_at: string
          enrollment_id: string | null
          id: string
          notes: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attendance_date?: string | null
          attended?: boolean
          class_id?: string | null
          created_at?: string
          enrollment_id?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attendance_date?: string | null
          attended?: boolean
          class_id?: string | null
          created_at?: string
          enrollment_id?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_attendance_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "course_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          cancellation_reason: string | null
          class_date: string
          course_id: string | null
          court_id: string | null
          created_at: string
          current_participants: number
          description: string | null
          end_time: string
          id: string
          is_cancelled: boolean
          max_participants: number
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          class_date: string
          course_id?: string | null
          court_id?: string | null
          created_at?: string
          current_participants?: number
          description?: string | null
          end_time: string
          id?: string
          is_cancelled?: boolean
          max_participants: number
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          class_date?: string
          course_id?: string | null
          court_id?: string | null
          created_at?: string
          current_participants?: number
          description?: string | null
          end_time?: string
          id?: string
          is_cancelled?: boolean
          max_participants?: number
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          cancellation_date: string | null
          cancellation_reason: string | null
          course_id: string | null
          created_at: string
          enrollment_date: string
          id: string
          payment_amount: number | null
          payment_status: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancellation_date?: string | null
          cancellation_reason?: string | null
          course_id?: string | null
          created_at?: string
          enrollment_date?: string
          id?: string
          payment_amount?: number | null
          payment_status?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancellation_date?: string | null
          cancellation_reason?: string | null
          course_id?: string | null
          created_at?: string
          enrollment_date?: string
          id?: string
          payment_amount?: number | null
          payment_status?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_notifications: {
        Row: {
          class_id: string | null
          course_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          sent_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          class_id?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_type: string
          sent_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          class_id?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          sent_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_notifications_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_notifications_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          court_type: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          instructor_id: string | null
          is_active: boolean
          level: string
          max_participants: number
          price_per_class: number
          requires_court: boolean
          sport_type: string
          title: string
          total_classes: number
          updated_at: string
        }
        Insert: {
          court_type?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          instructor_id?: string | null
          is_active?: boolean
          level: string
          max_participants?: number
          price_per_class?: number
          requires_court?: boolean
          sport_type: string
          title: string
          total_classes?: number
          updated_at?: string
        }
        Update: {
          court_type?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          instructor_id?: string | null
          is_active?: boolean
          level?: string
          max_participants?: number
          price_per_class?: number
          requires_court?: boolean
          sport_type?: string
          title?: string
          total_classes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructor_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      court_maintenance: {
        Row: {
          court_id: string
          created_at: string
          created_by: string
          end_time: string
          id: string
          is_active: boolean
          reason: string
          start_time: string
          updated_at: string
        }
        Insert: {
          court_id: string
          created_at?: string
          created_by: string
          end_time: string
          id?: string
          is_active?: boolean
          reason: string
          start_time: string
          updated_at?: string
        }
        Update: {
          court_id?: string
          created_at?: string
          created_by?: string
          end_time?: string
          id?: string
          is_active?: boolean
          reason?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_maintenance_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
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
          operador_price_per_hour: number | null
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
          operador_price_per_hour?: number | null
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
          operador_price_per_hour?: number | null
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
          default_view: string
          enable_all_view: boolean
          enable_single_view: boolean
          id: string
          is_enabled: boolean | null
          rotation_interval: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_view?: string
          enable_all_view?: boolean
          enable_single_view?: boolean
          id?: string
          is_enabled?: boolean | null
          rotation_interval?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_view?: string
          enable_all_view?: boolean
          enable_single_view?: boolean
          id?: string
          is_enabled?: boolean | null
          rotation_interval?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      failed_login_attempts: {
        Row: {
          attempt_time: string | null
          email: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          attempt_time?: string | null
          email: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          attempt_time?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      instructors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          certifications: string[] | null
          created_at: string
          email: string | null
          experience_years: number | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          specialties: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          email?: string | null
          experience_years?: number | null
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          specialties?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          email?: string | null
          experience_years?: number | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          specialties?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      interface_preferences: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_name: string
          feature_key: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_name: string
          feature_key: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_name?: string
          feature_key?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
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
            foreignKeyName: "match_invitations_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_invitations_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_invitations_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_management_settings: {
        Row: {
          cleanup_enabled: boolean
          cleanup_frequency_minutes: number
          cleanup_hours_after_booking: number
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          cleanup_enabled?: boolean
          cleanup_frequency_minutes?: number
          cleanup_hours_after_booking?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          cleanup_enabled?: boolean
          cleanup_frequency_minutes?: number
          cleanup_hours_after_booking?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "matches_player1_id_fkey_profiles"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "matches_player1_partner_id_fkey_profiles"
            columns: ["player1_partner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "matches_player2_id_fkey_profiles"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player2_partner_id_fkey_profiles"
            columns: ["player2_partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player2_partner_id_fkey_profiles"
            columns: ["player2_partner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          configuration: Json
          created_at: string
          enabled: boolean
          id: string
          name: string
          test_mode: boolean
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          test_mode?: boolean
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          test_mode?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          created_at: string
          id: string
          payment_timeout_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_timeout_minutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_timeout_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_bookings: number | null
          avatar_url: string | null
          created_at: string | null
          deactivated_at: string | null
          deactivated_by: string | null
          full_name: string | null
          id: string
          is_active: boolean
          is_membership_holder: boolean | null
          member_id: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          active_bookings?: number | null
          avatar_url?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          is_membership_holder?: boolean | null
          member_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          active_bookings?: number | null
          avatar_url?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_membership_holder?: boolean | null
          member_id?: string | null
          phone?: string | null
          updated_at?: string | null
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
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rankings_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_numbers: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string
          receipt_number: string
          sequential_number: number
          year: number
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          receipt_number: string
          sequential_number: number
          year: number
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          receipt_number?: string
          sequential_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipt_numbers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      special_bookings: {
        Row: {
          court_id: string
          created_at: string
          custom_price: number | null
          description: string | null
          end_time: string
          event_type: string
          id: string
          is_recurring: boolean
          price_type: string
          recurrence_pattern: string[] | null
          reference_user_id: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          court_id: string
          created_at?: string
          custom_price?: number | null
          description?: string | null
          end_time: string
          event_type: string
          id?: string
          is_recurring?: boolean
          price_type?: string
          recurrence_pattern?: string[] | null
          reference_user_id?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          court_id?: string
          created_at?: string
          custom_price?: number | null
          description?: string | null
          end_time?: string
          event_type?: string
          id?: string
          is_recurring?: boolean
          price_type?: string
          recurrence_pattern?: string[] | null
          reference_user_id?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_bookings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_bookings_reference_user_id_fkey"
            columns: ["reference_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_bookings_reference_user_id_fkey"
            columns: ["reference_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_registration_requests: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_membership_holder: boolean | null
          is_migration: boolean
          member_id: string
          phone: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          send_password_reset: boolean | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_membership_holder?: boolean | null
          is_migration?: boolean
          member_id: string
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          send_password_reset?: boolean | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_membership_holder?: boolean | null
          is_migration?: boolean
          member_id?: string
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          send_password_reset?: boolean | null
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      webhooks: {
        Row: {
          created_at: string
          event_type: string
          headers: Json | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          event_type: string
          headers?: Json | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          event_type?: string
          headers?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      display_bookings_combined: {
        Row: {
          actual_amount_charged: number | null
          booking_made_at: string | null
          court_id: string | null
          court_name: string | null
          court_type: string | null
          created_at: string | null
          description: string | null
          end_time: string | null
          event_type: string | null
          id: string | null
          is_special: boolean | null
          member_id: string | null
          payment_method: string | null
          start_time: string | null
          status: string | null
          title: string | null
          user_full_name: string | null
          user_id: string | null
        }
        Relationships: []
      }
      instructor_public_info: {
        Row: {
          avatar_url: string | null
          bio: string | null
          certifications: string[] | null
          created_at: string | null
          experience_years: number | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          specialties: string[] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string | null
          experience_years?: number | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string | null
          experience_years?: number | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_bookings_display: {
        Row: {
          court_id: string | null
          court_name: string | null
          court_type: string | null
          end_time: string | null
          id: string | null
          start_time: string | null
          status: string | null
          user_display_name: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
        }
        Relationships: []
      }
      public_special_bookings_display: {
        Row: {
          court_id: string | null
          created_at: string | null
          description: string | null
          end_time: string | null
          event_type: string | null
          id: string | null
          start_time: string | null
          title: string | null
        }
        Insert: {
          court_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string | null
          start_time?: string | null
          title?: string | null
        }
        Update: {
          court_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          id?: string | null
          start_time?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_bookings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      audit_security_action: {
        Args: {
          p_action_type: string
          p_details?: Json
          p_record_id?: string
          p_table_name: string
        }
        Returns: undefined
      }
      calculate_booking_expiration: {
        Args: { booking_time: string }
        Returns: string
      }
      can_use_member_id: {
        Args: { p_email: string; p_full_name: string; p_member_id: string }
        Returns: boolean
      }
      cleanup_expired_bookings: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_failed_login_attempts: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_incomplete_matches: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_receipt_number: {
        Args: { p_booking_id: string }
        Returns: string
      }
      deactivate_family_member: {
        Args: {
          p_member_id_to_deactivate: string
          p_requesting_user_id: string
        }
        Returns: boolean
      }
      execute_cronjob_sql: {
        Args: { sql_query: string }
        Returns: Json
      }
      generate_receipt_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_instructor_contact: {
        Args: { instructor_id: string }
        Returns: {
          email: string
          phone: string
        }[]
      }
      get_user_display_name: {
        Args: { user_id: string }
        Returns: string
      }
      get_user_full_name_public: {
        Args: { uid: string }
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_or_operator: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_family_member: {
        Args: { _target_user_id: string; _user_id: string }
        Returns: boolean
      }
      manage_cronjob_direct: {
        Args: {
          action_type: string
          cronjob_name?: string
          frequency?: string
          user_id_param: string
        }
        Returns: Json
      }
      reactivate_family_member: {
        Args: { p_member_id_to_reactivate: string }
        Returns: boolean
      }
      recalculate_active_bookings: {
        Args: Record<PropertyKey, never> | { user_uuid: string }
        Returns: undefined
      }
      search_users_for_invitations: {
        Args: { search_term: string }
        Returns: {
          full_name: string
          id: string
          member_id: string
        }[]
      }
      verify_rate_limit: {
        Args: {
          p_email: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "user" | "operador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "user", "operador"],
    },
  },
} as const
