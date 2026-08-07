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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          business_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          customer_user_id: string | null
          id: string
          notes: string | null
          slot_id: string
          status: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          customer_user_id?: string | null
          id?: string
          notes?: string | null
          slot_id: string
          status?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          customer_user_id?: string | null
          id?: string
          notes?: string | null
          slot_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          brand_accent_color: string | null
          business_types: string[]
          categories: string[]
          contact_email: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          gallery_urls: string[]
          hero_image_url: string | null
          id: string
          instagram_url: string | null
          is_eco_friendly: boolean
          is_live: boolean
          logo_url: string | null
          main_video_url: string | null
          name: string
          owner_id: string
          short_video_urls: string[]
          slug: string | null
          view_count: number
          whatsapp: string | null
        }
        Insert: {
          brand_accent_color?: string | null
          business_types?: string[]
          categories?: string[]
          contact_email?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          gallery_urls?: string[]
          hero_image_url?: string | null
          id?: string
          instagram_url?: string | null
          is_eco_friendly?: boolean
          is_live?: boolean
          logo_url?: string | null
          main_video_url?: string | null
          name: string
          owner_id: string
          short_video_urls?: string[]
          slug?: string | null
          view_count?: number
          whatsapp?: string | null
        }
        Update: {
          brand_accent_color?: string | null
          business_types?: string[]
          categories?: string[]
          contact_email?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          gallery_urls?: string[]
          hero_image_url?: string | null
          id?: string
          instagram_url?: string | null
          is_eco_friendly?: boolean
          is_live?: boolean
          logo_url?: string | null
          main_video_url?: string | null
          name?: string
          owner_id?: string
          short_video_urls?: string[]
          slug?: string | null
          view_count?: number
          whatsapp?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_approved: boolean
          name: string
          suggested_by_business_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_approved?: boolean
          name: string
          suggested_by_business_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_approved?: boolean
          name?: string
          suggested_by_business_id?: string | null
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          state: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          state?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          state?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          party_a_id: string
          party_a_type: string
          party_b_id: string
          party_b_type: string
          requirement_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          party_a_id: string
          party_a_type: string
          party_b_id: string
          party_b_type: string
          requirement_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          party_a_id?: string
          party_a_type?: string
          party_b_id?: string
          party_b_type?: string
          requirement_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_areas: {
        Row: {
          business_id: string
          city: string | null
          id: string
          is_pan_india: boolean
        }
        Insert: {
          business_id: string
          city?: string | null
          id?: string
          is_pan_india?: boolean
        }
        Update: {
          business_id?: string
          city?: string | null
          id?: string
          is_pan_india?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "delivery_areas_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          created_at: string
          description: string | null
          end_date: string | null
          featured_until: string | null
          id: string
          image_urls: string[]
          is_featured: boolean
          latitude: number | null
          longitude: number | null
          organizer_id: string
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          featured_until?: string | null
          id?: string
          image_urls?: string[]
          is_featured?: boolean
          latitude?: number | null
          longitude?: number | null
          organizer_id: string
          start_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          featured_until?: string | null
          id?: string
          image_urls?: string[]
          is_featured?: boolean
          latitude?: number | null
          longitude?: number | null
          organizer_id?: string
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          business_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_placements: {
        Row: {
          business_id: string
          category: string | null
          city: string | null
          created_at: string
          end_date: string
          id: string
          plan_tier: string
          scope: string
          start_date: string
        }
        Insert: {
          business_id: string
          category?: string | null
          city?: string | null
          created_at?: string
          end_date: string
          id?: string
          plan_tier: string
          scope: string
          start_date?: string
        }
        Update: {
          business_id?: string
          category?: string | null
          city?: string | null
          created_at?: string
          end_date?: string
          id?: string
          plan_tier?: string
          scope?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_placements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_profiles: {
        Row: {
          approval_status: string
          business_id: string | null
          categories: string[]
          city: string | null
          deleted_at: string | null
          display_name: string
          engagement_rate: number | null
          follower_count: number | null
          id: string
          instagram_handle: string
          is_verified: boolean
          rate_card: Json | null
          reviewed_at: string | null
          submitted_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string
          business_id?: string | null
          categories?: string[]
          city?: string | null
          deleted_at?: string | null
          display_name: string
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string
          instagram_handle: string
          is_verified?: boolean
          rate_card?: Json | null
          reviewed_at?: string | null
          submitted_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string
          business_id?: string | null
          categories?: string[]
          city?: string | null
          deleted_at?: string | null
          display_name?: string
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string
          instagram_handle?: string
          is_verified?: boolean
          rate_card?: Json | null
          reviewed_at?: string | null
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          business_id: string
          description: string | null
          id: string
          image_url: string | null
          image_urls: string[]
          is_active: boolean
          name: string
          price: number | null
        }
        Insert: {
          business_id: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[]
          is_active?: boolean
          name: string
          price?: number | null
        }
        Update: {
          business_id?: string
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[]
          is_active?: boolean
          name?: string
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          id: string
          matched_business_id: string
          requirement_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          matched_business_id: string
          requirement_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          matched_business_id?: string
          requirement_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_matched_business_id_fkey"
            columns: ["matched_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          business_id: string
          city: string
          id: string
          is_primary: boolean
          state: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          city: string
          id?: string
          is_primary?: boolean
          state?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          city?: string
          id?: string
          is_primary?: boolean
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_profiles: {
        Row: {
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["account_role"]
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["account_role"]
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["account_role"]
        }
        Relationships: []
      }
      requirements: {
        Row: {
          budget: number | null
          category: string
          city: string | null
          created_at: string
          description: string
          id: string
          image_urls: string[]
          posted_by_business_id: string | null
          posted_by_type: string
          posted_by_user_id: string | null
        }
        Insert: {
          budget?: number | null
          category: string
          city?: string | null
          created_at?: string
          description: string
          id?: string
          image_urls?: string[]
          posted_by_business_id?: string | null
          posted_by_type: string
          posted_by_user_id?: string | null
        }
        Update: {
          budget?: number | null
          category?: string
          city?: string | null
          created_at?: string
          description?: string
          id?: string
          image_urls?: string[]
          posted_by_business_id?: string | null
          posted_by_type?: string
          posted_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requirements_posted_by_business_id_fkey"
            columns: ["posted_by_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      slots: {
        Row: {
          booked_count: number
          capacity: number
          date: string
          id: string
          staff_id: string
          start_time: string
          status: string
        }
        Insert: {
          booked_count?: number
          capacity?: number
          date: string
          id?: string
          staff_id: string
          start_time: string
          status?: string
        }
        Update: {
          booked_count?: number
          capacity?: number
          date?: string
          id?: string
          staff_id?: string
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "slots_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          business_id: string
          id: string
          name: string
          slot_duration_minutes: number
          specializations: string[]
          working_hours: Json
        }
        Insert: {
          business_id: string
          id?: string
          name: string
          slot_duration_minutes?: number
          specializations?: string[]
          working_hours?: Json
        }
        Update: {
          business_id?: string
          id?: string
          name?: string
          slot_duration_minutes?: number
          specializations?: string[]
          working_hours?: Json
        }
        Relationships: [
          {
            foreignKeyName: "staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          business_id: string
          created_at: string
          current_period_end: string | null
          id: string
          is_intro_month: boolean
          plan: string
          razorpay_subscription_id: string | null
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_intro_month?: boolean
          plan?: string
          razorpay_subscription_id?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_intro_month?: boolean
          plan?: string
          razorpay_subscription_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_slot: {
        Args: {
          _customer_email?: string
          _customer_name: string
          _customer_phone: string
          _notes?: string
          _slot_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      in_conversation: { Args: { _conversation_id: string }; Returns: boolean }
      increment_business_views: {
        Args: { _business_id: string }
        Returns: undefined
      }
      is_organizer: { Args: { _user_id: string }; Returns: boolean }
      owns_business: { Args: { _business_id: string }; Returns: boolean }
      soft_delete_account: { Args: never; Returns: undefined }
    }
    Enums: {
      account_role: "business" | "customer"
      app_role: "admin" | "moderator" | "user"
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
      account_role: ["business", "customer"],
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
