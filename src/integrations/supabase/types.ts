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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
          about_image_url: string | null
          about_text: string | null
          background_color: string | null
          brand_accent_color: string | null
          brand_secondary_color: string | null
          business_types: string[]
          button_style: string
          categories: string[]
          contact_email: string | null
          created_at: string
          custom_domain: string | null
          deleted_at: string | null
          description: string | null
          draft_sections: Json | null
          gallery_urls: string[]
          hero_image_url: string | null
          id: string
          instagram_url: string | null
          is_eco_friendly: boolean
          is_live: boolean
          logo_url: string | null
          main_video_url: string | null
          name: string
          operating_hours: Json | null
          owner_email_verified: boolean
          owner_id: string
          review_avg: number | null
          review_count: number
          sections: Json
          short_video_urls: string[]
          slug: string
          status: string
          template: string
          thumbnail_url: string | null
          view_count: number
          whatsapp: string | null
        }
        Insert: {
          about_image_url?: string | null
          about_text?: string | null
          background_color?: string | null
          brand_accent_color?: string | null
          brand_secondary_color?: string | null
          business_types?: string[]
          button_style?: string
          categories?: string[]
          contact_email?: string | null
          created_at?: string
          custom_domain?: string | null
          deleted_at?: string | null
          description?: string | null
          draft_sections?: Json | null
          gallery_urls?: string[]
          hero_image_url?: string | null
          id?: string
          instagram_url?: string | null
          is_eco_friendly?: boolean
          is_live?: boolean
          logo_url?: string | null
          main_video_url?: string | null
          name: string
          operating_hours?: Json | null
          owner_email_verified?: boolean
          owner_id: string
          review_avg?: number | null
          review_count?: number
          sections?: Json
          short_video_urls?: string[]
          slug: string
          status?: string
          template?: string
          thumbnail_url?: string | null
          view_count?: number
          whatsapp?: string | null
        }
        Update: {
          about_image_url?: string | null
          about_text?: string | null
          background_color?: string | null
          brand_accent_color?: string | null
          brand_secondary_color?: string | null
          business_types?: string[]
          button_style?: string
          categories?: string[]
          contact_email?: string | null
          created_at?: string
          custom_domain?: string | null
          deleted_at?: string | null
          description?: string | null
          draft_sections?: Json | null
          gallery_urls?: string[]
          hero_image_url?: string | null
          id?: string
          instagram_url?: string | null
          is_eco_friendly?: boolean
          is_live?: boolean
          logo_url?: string | null
          main_video_url?: string | null
          name?: string
          operating_hours?: Json | null
          owner_email_verified?: boolean
          owner_id?: string
          review_avg?: number | null
          review_count?: number
          sections?: Json
          short_video_urls?: string[]
          slug?: string
          status?: string
          template?: string
          thumbnail_url?: string | null
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
      collaboration_requests: {
        Row: {
          brief: string
          business_id: string
          conversation_id: string | null
          counter_rate: number | null
          created_at: string
          id: string
          influencer_id: string
          proposed_rate: number | null
          rate_card_item: string | null
          status: string
          updated_at: string
        }
        Insert: {
          brief: string
          business_id: string
          conversation_id?: string | null
          counter_rate?: number | null
          created_at?: string
          id?: string
          influencer_id: string
          proposed_rate?: number | null
          rate_card_item?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          brief?: string
          business_id?: string
          conversation_id?: string | null
          counter_rate?: number | null
          created_at?: string
          id?: string
          influencer_id?: string
          proposed_rate?: number | null
          rate_card_item?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_requests_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencer_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          category: string | null
          description: string | null
          id: string
          image_url: string | null
          image_urls: string[]
          is_active: boolean
          name: string
          position: number
          price: number | null
        }
        Insert: {
          business_id: string
          category?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[]
          is_active?: boolean
          name: string
          position?: number
          price?: number | null
        }
        Update: {
          business_id?: string
          category?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[]
          is_active?: boolean
          name?: string
          position?: number
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
          pincode: string | null
          state: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          city: string
          id?: string
          is_primary?: boolean
          pincode?: string | null
          state?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          city?: string
          id?: string
          is_primary?: boolean
          pincode?: string | null
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
          message_type: string
          quote_details: Json | null
          read_at: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string
          quote_details?: Json | null
          read_at?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string
          quote_details?: Json | null
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          recipient_id: string
          recipient_type: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_id: string
          recipient_type: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_id?: string
          recipient_type?: string
          title?: string
          type?: string
        }
        Relationships: []
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
          extra_answers: Json | null
          id: string
          image_urls: string[]
          posted_by_business_id: string | null
          posted_by_type: string
          posted_by_user_id: string | null
          status: string
        }
        Insert: {
          budget?: number | null
          category: string
          city?: string | null
          created_at?: string
          description: string
          extra_answers?: Json | null
          id?: string
          image_urls?: string[]
          posted_by_business_id?: string | null
          posted_by_type: string
          posted_by_user_id?: string | null
          status?: string
        }
        Update: {
          budget?: number | null
          category?: string
          city?: string | null
          created_at?: string
          description?: string
          extra_answers?: Json | null
          id?: string
          image_urls?: string[]
          posted_by_business_id?: string | null
          posted_by_type?: string
          posted_by_user_id?: string | null
          status?: string
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
      reviews: {
        Row: {
          booking_id: string
          business_id: string
          comment: string | null
          created_at: string
          customer_user_id: string
          id: string
          rating: number
        }
        Insert: {
          booking_id: string
          business_id: string
          comment?: string | null
          created_at?: string
          customer_user_id: string
          id?: string
          rating: number
        }
        Update: {
          booking_id?: string
          business_id?: string
          comment?: string | null
          created_at?: string
          customer_user_id?: string
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          business_id: string
          category: string | null
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          position: number
          price: number | null
        }
        Insert: {
          business_id: string
          category?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          position?: number
          price?: number | null
        }
        Update: {
          business_id?: string
          category?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          position?: number
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
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
          blocked_dates: string[]
          buffer_minutes: number
          business_id: string
          id: string
          name: string
          slot_duration_minutes: number
          specializations: string[]
          working_hours: Json
        }
        Insert: {
          blocked_dates?: string[]
          buffer_minutes?: number
          business_id: string
          id?: string
          name: string
          slot_duration_minutes?: number
          specializations?: string[]
          working_hours?: Json
        }
        Update: {
          blocked_dates?: string[]
          buffer_minutes?: number
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
      admin_merge_category: {
        Args: { _pending_id: string; _target_name: string }
        Returns: undefined
      }
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
      can_review_booking: {
        Args: { _booking_id: string; _business_id: string }
        Returns: boolean
      }
      cancel_booking: { Args: { _booking_id: string }; Returns: undefined }
      cleanup_expired_events: { Args: never; Returns: undefined }
      get_conversation_partner_names: {
        Args: { _conversation_ids: string[] }
        Returns: {
          conversation_id: string
          partner_name: string
        }[]
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
      mark_conversation_read: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      owns_business: { Args: { _business_id: string }; Returns: boolean }
      owns_influencer_profile: {
        Args: { _influencer_id: string }
        Returns: boolean
      }
      owns_requirement: { Args: { _requirement_id: string }; Returns: boolean }
      requirement_has_matched_business: {
        Args: { _requirement_id: string }
        Returns: boolean
      }
      reschedule_booking: {
        Args: { _booking_id: string; _new_slot_id: string }
        Returns: undefined
      }
      reserve_featured_placement: {
        Args: {
          _business_id: string
          _category: string
          _city: string
          _plan_tier: string
          _scope: string
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "featured_placements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      soft_delete_account: { Args: never; Returns: undefined }
      submit_requirement_with_matches: {
        Args: {
          _budget?: number
          _category: string
          _city?: string
          _description: string
          _image_urls?: string[]
          _matched_business_ids?: string[]
        }
        Returns: string
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_role: ["business", "customer"],
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
