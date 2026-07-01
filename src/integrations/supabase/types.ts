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
      addresses: {
        Row: {
          city: string | null
          complement: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          delivery_instructions: string | null
          id: string
          is_default: boolean
          label: string
          latitude: number | null
          longitude: number | null
          neighborhood: string | null
          number: string | null
          popular_location_name: string | null
          reference: string | null
          state: string | null
          street: string
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          city?: string | null
          complement?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_instructions?: string | null
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          number?: string | null
          popular_location_name?: string | null
          reference?: string | null
          state?: string | null
          street: string
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          city?: string | null
          complement?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_instructions?: string | null
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          number?: string | null
          popular_location_name?: string | null
          reference?: string | null
          state?: string | null
          street?: string
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: []
      }
      admin_convite_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          params: Json
          result: Json
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          params?: Json
          result?: Json
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          params?: Json
          result?: Json
        }
        Relationships: []
      }
      announcement_recipients: {
        Row: {
          announcement_id: string
          establishment_id: string
          id: string
          read_at: string | null
        }
        Insert: {
          announcement_id: string
          establishment_id: string
          id?: string
          read_at?: string | null
        }
        Update: {
          announcement_id?: string
          establishment_id?: string
          id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_recipients_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_recipients_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: string
          audience_filter: Json
          body: string
          created_by: string | null
          id: string
          send_email: boolean
          sent_at: string
          title: string
        }
        Insert: {
          audience?: string
          audience_filter?: Json
          body: string
          created_by?: string | null
          id?: string
          send_email?: boolean
          sent_at?: string
          title: string
        }
        Update: {
          audience?: string
          audience_filter?: Json
          body?: string
          created_by?: string | null
          id?: string
          send_email?: boolean
          sent_at?: string
          title?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string
          id: string
          meta: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          id?: string
          meta?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string
          id?: string
          meta?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          active: boolean
          category_key: string | null
          clicks: number
          created_at: string
          cta_label: string | null
          ends_at: string | null
          establishment_id: string | null
          id: string
          image: string
          impressions: number
          link: string | null
          media_type: string
          paid_by_establishment_id: string | null
          placement: Database["public"]["Enums"]["banner_placement"]
          position: number
          priority: number
          starts_at: string | null
          title: string | null
        }
        Insert: {
          active?: boolean
          category_key?: string | null
          clicks?: number
          created_at?: string
          cta_label?: string | null
          ends_at?: string | null
          establishment_id?: string | null
          id?: string
          image: string
          impressions?: number
          link?: string | null
          media_type?: string
          paid_by_establishment_id?: string | null
          placement?: Database["public"]["Enums"]["banner_placement"]
          position?: number
          priority?: number
          starts_at?: string | null
          title?: string | null
        }
        Update: {
          active?: boolean
          category_key?: string | null
          clicks?: number
          created_at?: string
          cta_label?: string | null
          ends_at?: string | null
          establishment_id?: string | null
          id?: string
          image?: string
          impressions?: number
          link?: string | null
          media_type?: string
          paid_by_establishment_id?: string | null
          placement?: Database["public"]["Enums"]["banner_placement"]
          position?: number
          priority?: number
          starts_at?: string | null
          title?: string | null
        }
        Relationships: []
      }
      benchmark_metrics: {
        Row: {
          average_conversion_rate: number
          average_estimated_ticket: number
          average_profile_views: number
          average_whatsapp_clicks: number
          category: string
          city: string | null
          created_at: string
          id: string
          neighborhood: string | null
          peak_hours: Json
          period_end: string
          period_start: string
          sample_size: number
          top_product_types: Json
        }
        Insert: {
          average_conversion_rate?: number
          average_estimated_ticket?: number
          average_profile_views?: number
          average_whatsapp_clicks?: number
          category: string
          city?: string | null
          created_at?: string
          id?: string
          neighborhood?: string | null
          peak_hours?: Json
          period_end: string
          period_start: string
          sample_size?: number
          top_product_types?: Json
        }
        Update: {
          average_conversion_rate?: number
          average_estimated_ticket?: number
          average_profile_views?: number
          average_whatsapp_clicks?: number
          category?: string
          city?: string | null
          created_at?: string
          id?: string
          neighborhood?: string | null
          peak_hours?: Json
          period_end?: string
          period_start?: string
          sample_size?: number
          top_product_types?: Json
        }
        Relationships: []
      }
      business_insights: {
        Row: {
          created_at: string
          description: string
          establishment_id: string
          id: string
          insight_type: string
          recommendation: string
          severity: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          establishment_id: string
          id?: string
          insight_type: string
          recommendation: string
          severity?: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          establishment_id?: string
          id?: string
          insight_type?: string
          recommendation?: string
          severity?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      checkout_delivery_info: {
        Row: {
          address_id: string | null
          address_snapshot_json: Json | null
          created_at: string
          delivery_confidence_level: Database["public"]["Enums"]["delivery_confidence_level"]
          delivery_fee_estimated: number | null
          delivery_fee_status: Database["public"]["Enums"]["delivery_fee_status"]
          establishment_id: string
          id: string
          order_id: string | null
          requires_manual_confirmation: boolean
          selected_region_id: string | null
          selected_region_name: string | null
          user_id: string | null
          visual_reference_link: string | null
        }
        Insert: {
          address_id?: string | null
          address_snapshot_json?: Json | null
          created_at?: string
          delivery_confidence_level?: Database["public"]["Enums"]["delivery_confidence_level"]
          delivery_fee_estimated?: number | null
          delivery_fee_status?: Database["public"]["Enums"]["delivery_fee_status"]
          establishment_id: string
          id?: string
          order_id?: string | null
          requires_manual_confirmation?: boolean
          selected_region_id?: string | null
          selected_region_name?: string | null
          user_id?: string | null
          visual_reference_link?: string | null
        }
        Update: {
          address_id?: string | null
          address_snapshot_json?: Json | null
          created_at?: string
          delivery_confidence_level?: Database["public"]["Enums"]["delivery_confidence_level"]
          delivery_fee_estimated?: number | null
          delivery_fee_status?: Database["public"]["Enums"]["delivery_fee_status"]
          establishment_id?: string
          id?: string
          order_id?: string | null
          requires_manual_confirmation?: boolean
          selected_region_id?: string | null
          selected_region_name?: string | null
          user_id?: string | null
          visual_reference_link?: string | null
        }
        Relationships: []
      }
      delivery_drivers: {
        Row: {
          created_at: string
          driver_type: string
          establishment_id: string
          id: string
          name: string
          neighborhood_coverage: string | null
          notes: string | null
          regions_json: Json | null
          secondary_phone: string | null
          status: string
          updated_at: string
          whatsapp_phone: string
        }
        Insert: {
          created_at?: string
          driver_type?: string
          establishment_id: string
          id?: string
          name: string
          neighborhood_coverage?: string | null
          notes?: string | null
          regions_json?: Json | null
          secondary_phone?: string | null
          status?: string
          updated_at?: string
          whatsapp_phone: string
        }
        Update: {
          created_at?: string
          driver_type?: string
          establishment_id?: string
          id?: string
          name?: string
          neighborhood_coverage?: string | null
          notes?: string | null
          regions_json?: Json | null
          secondary_phone?: string | null
          status?: string
          updated_at?: string
          whatsapp_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_drivers_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_regions: {
        Row: {
          created_at: string
          display_order: number
          establishment_id: string
          estimated_time: number | null
          fee: number
          id: string
          internal_note: string | null
          min_order_value: number
          name: string
          public_note: string | null
          requires_manual_confirmation: boolean
          status: Database["public"]["Enums"]["delivery_region_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          establishment_id: string
          estimated_time?: number | null
          fee?: number
          id?: string
          internal_note?: string | null
          min_order_value?: number
          name: string
          public_note?: string | null
          requires_manual_confirmation?: boolean
          status?: Database["public"]["Enums"]["delivery_region_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          establishment_id?: string
          estimated_time?: number | null
          fee?: number
          id?: string
          internal_note?: string | null
          min_order_value?: number
          name?: string
          public_note?: string | null
          requires_manual_confirmation?: boolean
          status?: Database["public"]["Enums"]["delivery_region_status"]
          updated_at?: string
        }
        Relationships: []
      }
      establishment_approval_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          establishment_id: string
          id: string
          new_status: string | null
          notes: string | null
          old_status: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          establishment_id: string
          id?: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          establishment_id?: string
          id?: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishment_approval_logs_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_approval_requests: {
        Row: {
          admin_notes: string | null
          correction_requested_fields_json: Json
          created_at: string
          establishment_id: string
          id: string
          owner_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_data_json: Json
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          correction_requested_fields_json?: Json
          created_at?: string
          establishment_id: string
          id?: string
          owner_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_data_json?: Json
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          correction_requested_fields_json?: Json
          created_at?: string
          establishment_id?: string
          id?: string
          owner_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_data_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "establishment_approval_requests_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_delivery_settings: {
        Row: {
          always_confirm_by_whatsapp: boolean
          created_at: string
          default_delivery_message: string | null
          delivery_available: boolean
          delivery_model: Database["public"]["Enums"]["delivery_model"]
          delivery_v2_enabled: boolean
          dine_in_available: boolean
          distance_base_fee: number | null
          distance_free_km: number | null
          distance_max_km: number | null
          distance_per_km: number | null
          establishment_id: string
          id: string
          outside_area_message: string | null
          pickup_available: boolean
          updated_at: string
        }
        Insert: {
          always_confirm_by_whatsapp?: boolean
          created_at?: string
          default_delivery_message?: string | null
          delivery_available?: boolean
          delivery_model?: Database["public"]["Enums"]["delivery_model"]
          delivery_v2_enabled?: boolean
          dine_in_available?: boolean
          distance_base_fee?: number | null
          distance_free_km?: number | null
          distance_max_km?: number | null
          distance_per_km?: number | null
          establishment_id: string
          id?: string
          outside_area_message?: string | null
          pickup_available?: boolean
          updated_at?: string
        }
        Update: {
          always_confirm_by_whatsapp?: boolean
          created_at?: string
          default_delivery_message?: string | null
          delivery_available?: boolean
          delivery_model?: Database["public"]["Enums"]["delivery_model"]
          delivery_v2_enabled?: boolean
          dine_in_available?: boolean
          distance_base_fee?: number | null
          distance_free_km?: number | null
          distance_max_km?: number | null
          distance_per_km?: number | null
          establishment_id?: string
          id?: string
          outside_area_message?: string | null
          pickup_available?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      establishment_owners: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          establishment_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "establishment_owners_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_subscriptions: {
        Row: {
          created_at: string
          establishment_id: string
          expires_at: string | null
          id: string
          plan_id: string
          started_at: string
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          establishment_id: string
          expires_at?: string | null
          id?: string
          plan_id: string
          started_at?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          establishment_id?: string
          expires_at?: string | null
          id?: string
          plan_id?: string
          started_at?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      establishment_themes: {
        Row: {
          accent_color: string | null
          background_blur: number
          background_color: string | null
          background_image: string | null
          background_opacity: number
          card_style: string
          created_at: string
          establishment_id: string
          font_pair: string
          header_style: string
          menu_banners: Json
          show_gallery: boolean
          show_reviews_inline: boolean
          show_story: boolean
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          background_blur?: number
          background_color?: string | null
          background_image?: string | null
          background_opacity?: number
          card_style?: string
          created_at?: string
          establishment_id: string
          font_pair?: string
          header_style?: string
          menu_banners?: Json
          show_gallery?: boolean
          show_reviews_inline?: boolean
          show_story?: boolean
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          background_blur?: number
          background_color?: string | null
          background_image?: string | null
          background_opacity?: number
          card_style?: string
          created_at?: string
          establishment_id?: string
          font_pair?: string
          header_style?: string
          menu_banners?: Json
          show_gallery?: boolean
          show_reviews_inline?: boolean
          show_story?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      establishments: {
        Row: {
          address: string | null
          ambient_photos: Json
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          auto_open_now: boolean
          badges: string[]
          brand_color: string | null
          business_hours: Json
          category: string
          category_label: string
          city: string | null
          cover: string | null
          created_at: string
          delivery_fee: number | null
          description: string | null
          distance_km: number | null
          eta_min: number | null
          gallery: string[]
          hours: string | null
          hours_timezone: string
          id: string
          is_public: boolean
          last_menu_update_at: string | null
          latitude: number | null
          logo: string | null
          longitude: number | null
          menu_type: Database["public"]["Enums"]["menu_type"]
          name: string
          neighborhood: string | null
          open_now: boolean
          owner_id: string | null
          payments: string[]
          plan_id: string | null
          published_at: string | null
          rating: number
          ref_link_expiration_hours: number | null
          reviews_count: number
          services: string[]
          slug: string
          special_hours: Json
          status: Database["public"]["Enums"]["establishment_status"]
          story: string | null
          suspended_reason: string | null
          tagline: string | null
          updated_at: string
          video_url: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          ambient_photos?: Json
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_open_now?: boolean
          badges?: string[]
          brand_color?: string | null
          business_hours?: Json
          category: string
          category_label: string
          city?: string | null
          cover?: string | null
          created_at?: string
          delivery_fee?: number | null
          description?: string | null
          distance_km?: number | null
          eta_min?: number | null
          gallery?: string[]
          hours?: string | null
          hours_timezone?: string
          id?: string
          is_public?: boolean
          last_menu_update_at?: string | null
          latitude?: number | null
          logo?: string | null
          longitude?: number | null
          menu_type?: Database["public"]["Enums"]["menu_type"]
          name: string
          neighborhood?: string | null
          open_now?: boolean
          owner_id?: string | null
          payments?: string[]
          plan_id?: string | null
          published_at?: string | null
          rating?: number
          ref_link_expiration_hours?: number | null
          reviews_count?: number
          services?: string[]
          slug: string
          special_hours?: Json
          status?: Database["public"]["Enums"]["establishment_status"]
          story?: string | null
          suspended_reason?: string | null
          tagline?: string | null
          updated_at?: string
          video_url?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          ambient_photos?: Json
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_open_now?: boolean
          badges?: string[]
          brand_color?: string | null
          business_hours?: Json
          category?: string
          category_label?: string
          city?: string | null
          cover?: string | null
          created_at?: string
          delivery_fee?: number | null
          description?: string | null
          distance_km?: number | null
          eta_min?: number | null
          gallery?: string[]
          hours?: string | null
          hours_timezone?: string
          id?: string
          is_public?: boolean
          last_menu_update_at?: string | null
          latitude?: number | null
          logo?: string | null
          longitude?: number | null
          menu_type?: Database["public"]["Enums"]["menu_type"]
          name?: string
          neighborhood?: string | null
          open_now?: boolean
          owner_id?: string | null
          payments?: string[]
          plan_id?: string | null
          published_at?: string | null
          rating?: number
          ref_link_expiration_hours?: number | null
          reviews_count?: number
          services?: string[]
          slug?: string
          special_hours?: Json
          status?: Database["public"]["Enums"]["establishment_status"]
          story?: string | null
          suspended_reason?: string | null
          tagline?: string | null
          updated_at?: string
          video_url?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          establishment_id: string | null
          hour: number | null
          id: string
          meta: Json
          neighborhood: string | null
          product_id: string | null
          session_id: string | null
          type: Database["public"]["Enums"]["event_type"]
          value_cents: number | null
          weekday: number | null
        }
        Insert: {
          created_at?: string
          establishment_id?: string | null
          hour?: number | null
          id?: string
          meta?: Json
          neighborhood?: string | null
          product_id?: string | null
          session_id?: string | null
          type: Database["public"]["Enums"]["event_type"]
          value_cents?: number | null
          weekday?: number | null
        }
        Update: {
          created_at?: string
          establishment_id?: string | null
          hour?: number | null
          id?: string
          meta?: Json
          neighborhood?: string | null
          product_id?: string | null
          session_id?: string | null
          type?: Database["public"]["Enums"]["event_type"]
          value_cents?: number | null
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["favorite_kind"]
          target_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["favorite_kind"]
          target_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["favorite_kind"]
          target_id?: string
          user_id?: string
        }
        Relationships: []
      }
      house_reference_media: {
        Row: {
          address_id: string | null
          created_at: string | null
          display_order: number | null
          house_reference_id: string
          id: string
          is_active: boolean | null
          label: string | null
          media_type: string
          media_url: string
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_id?: string | null
          created_at?: string | null
          display_order?: number | null
          house_reference_id: string
          id?: string
          is_active?: boolean | null
          label?: string | null
          media_type: string
          media_url: string
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_id?: string | null
          created_at?: string | null
          display_order?: number | null
          house_reference_id?: string
          id?: string
          is_active?: boolean | null
          label?: string | null
          media_type?: string
          media_url?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_reference_media_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_reference_media_house_reference_id_fkey"
            columns: ["house_reference_id"]
            isOneToOne: false
            referencedRelation: "house_references"
            referencedColumns: ["id"]
          },
        ]
      }
      house_references: {
        Row: {
          address_id: string | null
          created_at: string
          id: string
          instructions: string | null
          media_urls: Json
          pin_1_description: string | null
          pin_2_description: string | null
          pin_3_description: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          address_id?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          media_urls?: Json
          pin_1_description?: string | null
          pin_2_description?: string | null
          pin_3_description?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          address_id?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          media_urls?: Json
          pin_1_description?: string | null
          pin_2_description?: string | null
          pin_3_description?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "house_references_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          establishment_id: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          establishment_id: string | null
          id: string
          message: string
          read_at: string | null
          related_order_id: string | null
          related_support_chat_id: string | null
          related_ticket_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          establishment_id?: string | null
          id?: string
          message: string
          read_at?: string | null
          related_order_id?: string | null
          related_support_chat_id?: string | null
          related_ticket_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          establishment_id?: string | null
          id?: string
          message?: string
          read_at?: string | null
          related_order_id?: string | null
          related_support_chat_id?: string | null
          related_ticket_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      order_confirmation_proposals: {
        Row: {
          accepted_at: string | null
          business_note: string | null
          canceled_at: string | null
          created_at: string
          created_by: string | null
          customer_response_note: string | null
          establishment_id: string
          estimated_delivery_time_min: number | null
          estimated_preparation_time_min: number | null
          expires_at: string | null
          id: string
          order_id: string
          proposed_delivery_fee: number | null
          proposed_discount: number | null
          proposed_extra_fee: number | null
          proposed_subtotal: number | null
          proposed_total: number | null
          rejected_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          business_note?: string | null
          canceled_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_response_note?: string | null
          establishment_id: string
          estimated_delivery_time_min?: number | null
          estimated_preparation_time_min?: number | null
          expires_at?: string | null
          id?: string
          order_id: string
          proposed_delivery_fee?: number | null
          proposed_discount?: number | null
          proposed_extra_fee?: number | null
          proposed_subtotal?: number | null
          proposed_total?: number | null
          rejected_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          business_note?: string | null
          canceled_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_response_note?: string | null
          establishment_id?: string
          estimated_delivery_time_min?: number | null
          estimated_preparation_time_min?: number | null
          expires_at?: string | null
          id?: string
          order_id?: string
          proposed_delivery_fee?: number | null
          proposed_discount?: number | null
          proposed_extra_fee?: number | null
          proposed_subtotal?: number | null
          proposed_total?: number | null
          rejected_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_confirmation_proposals_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_confirmation_proposals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_financial_marks: {
        Row: {
          amount_received: number | null
          created_at: string
          establishment_id: string
          id: string
          marked_at: string
          marked_by: string | null
          notes: string | null
          order_id: string
          paid_at: string | null
          paid_status: string
          payment_method_real: string | null
          updated_at: string
        }
        Insert: {
          amount_received?: number | null
          created_at?: string
          establishment_id: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          notes?: string | null
          order_id: string
          paid_at?: string | null
          paid_status?: string
          payment_method_real?: string | null
          updated_at?: string
        }
        Update: {
          amount_received?: number | null
          created_at?: string
          establishment_id?: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          notes?: string | null
          order_id?: string
          paid_at?: string | null
          paid_status?: string
          payment_method_real?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_financial_marks_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_financial_marks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_messages: {
        Row: {
          attachments: Json
          created_at: string | null
          customer_user_id: string | null
          establishment_id: string | null
          id: string
          message: string
          order_id: string
          read_at: string | null
          sender_type: string
          sender_user_id: string | null
        }
        Insert: {
          attachments?: Json
          created_at?: string | null
          customer_user_id?: string | null
          establishment_id?: string | null
          id?: string
          message: string
          order_id: string
          read_at?: string | null
          sender_type: string
          sender_user_id?: string | null
        }
        Update: {
          attachments?: Json
          created_at?: string | null
          customer_user_id?: string | null
          establishment_id?: string | null
          id?: string
          message?: string
          order_id?: string
          read_at?: string | null
          sender_type?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_reference_share_links: {
        Row: {
          created_at: string
          created_by: string | null
          establishment_id: string
          expires_at: string | null
          id: string
          order_id: string
          private_token: string
          recipient_driver_id: string | null
          recipient_phone: string | null
          selected_media_json: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          establishment_id: string
          expires_at?: string | null
          id?: string
          order_id: string
          private_token?: string
          recipient_driver_id?: string | null
          recipient_phone?: string | null
          selected_media_json?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          establishment_id?: string
          expires_at?: string | null
          id?: string
          order_id?: string
          private_token?: string
          recipient_driver_id?: string | null
          recipient_phone?: string | null
          selected_media_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_reference_share_links_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reference_share_links_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reference_share_links_recipient_driver_id_fkey"
            columns: ["recipient_driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_reference_share_logs: {
        Row: {
          created_at: string
          created_by: string | null
          driver_id: string | null
          driver_name: string | null
          driver_phone: string | null
          establishment_id: string
          id: string
          order_id: string
          private_url: string | null
          selected_media_json: Json | null
          sent_via: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          driver_id?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          establishment_id: string
          id?: string
          order_id: string
          private_url?: string | null
          selected_media_json?: Json | null
          sent_via: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          driver_id?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          establishment_id?: string
          id?: string
          order_id?: string
          private_url?: string | null
          selected_media_json?: Json | null
          sent_via?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_reference_share_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reference_share_logs_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reference_share_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string
          created_by: string | null
          from_status: string | null
          id: string
          note: string | null
          order_id: string
          to_status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_status?: string | null
          id?: string
          note?: string | null
          order_id: string
          to_status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_status?: string | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_visual_reference_links: {
        Row: {
          address_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          order_id: string | null
          private_token: string
          user_id: string | null
          visual_reference_id: string | null
        }
        Insert: {
          address_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          private_token?: string
          user_id?: string | null
          visual_reference_id?: string | null
        }
        Update: {
          address_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          private_token?: string
          user_id?: string | null
          visual_reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_visual_reference_links_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_visual_reference_links_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_visual_reference_links_visual_reference_id_fkey"
            columns: ["visual_reference_id"]
            isOneToOne: false
            referencedRelation: "house_references"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          assigned_driver_id: string | null
          assigned_driver_name: string | null
          assigned_driver_phone: string | null
          availability_confirmed_at: string | null
          business_confirmation_note: string | null
          confirmation_flow_status: string | null
          confirmed_at: string | null
          created_at: string
          current_confirmation_proposal_id: string | null
          customer_accepted_proposal_at: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_rejected_proposal_at: string | null
          delivery_fee: number
          delivery_fee_estimated: number | null
          driver_reference_sent_at: string | null
          establishment_id: string
          establishment_reply: string | null
          estimated_minutes: number | null
          final_delivery_fee: number | null
          final_discount: number | null
          final_extra_fee: number | null
          final_subtotal: number | null
          final_total: number | null
          id: string
          items: Json
          last_whatsapp_sent_at: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_method_intent: string | null
          payment_note: string | null
          payment_paid_at: string | null
          payment_received_method: string | null
          payment_status: string | null
          sent_to_whatsapp_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          status_history: Json
          subtotal: number
          total: number
          total_estimated: number | null
          tracking_code: string | null
          updated_at: string
          user_id: string | null
          whatsapp_message: string | null
          whatsapp_resent_count: number
          whatsapp_sent_at: string | null
        }
        Insert: {
          address_id?: string | null
          assigned_driver_id?: string | null
          assigned_driver_name?: string | null
          assigned_driver_phone?: string | null
          availability_confirmed_at?: string | null
          business_confirmation_note?: string | null
          confirmation_flow_status?: string | null
          confirmed_at?: string | null
          created_at?: string
          current_confirmation_proposal_id?: string | null
          customer_accepted_proposal_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_rejected_proposal_at?: string | null
          delivery_fee?: number
          delivery_fee_estimated?: number | null
          driver_reference_sent_at?: string | null
          establishment_id: string
          establishment_reply?: string | null
          estimated_minutes?: number | null
          final_delivery_fee?: number | null
          final_discount?: number | null
          final_extra_fee?: number | null
          final_subtotal?: number | null
          final_total?: number | null
          id?: string
          items?: Json
          last_whatsapp_sent_at?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_method_intent?: string | null
          payment_note?: string | null
          payment_paid_at?: string | null
          payment_received_method?: string | null
          payment_status?: string | null
          sent_to_whatsapp_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          status_history?: Json
          subtotal?: number
          total?: number
          total_estimated?: number | null
          tracking_code?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_message?: string | null
          whatsapp_resent_count?: number
          whatsapp_sent_at?: string | null
        }
        Update: {
          address_id?: string | null
          assigned_driver_id?: string | null
          assigned_driver_name?: string | null
          assigned_driver_phone?: string | null
          availability_confirmed_at?: string | null
          business_confirmation_note?: string | null
          confirmation_flow_status?: string | null
          confirmed_at?: string | null
          created_at?: string
          current_confirmation_proposal_id?: string | null
          customer_accepted_proposal_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_rejected_proposal_at?: string | null
          delivery_fee?: number
          delivery_fee_estimated?: number | null
          driver_reference_sent_at?: string | null
          establishment_id?: string
          establishment_reply?: string | null
          estimated_minutes?: number | null
          final_delivery_fee?: number | null
          final_discount?: number | null
          final_extra_fee?: number | null
          final_subtotal?: number | null
          final_total?: number | null
          id?: string
          items?: Json
          last_whatsapp_sent_at?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_method_intent?: string | null
          payment_note?: string | null
          payment_paid_at?: string | null
          payment_received_method?: string | null
          payment_status?: string | null
          sent_to_whatsapp_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          status_history?: Json
          subtotal?: number
          total?: number
          total_estimated?: number | null
          tracking_code?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_message?: string | null
          whatsapp_resent_count?: number
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_current_confirmation_proposal_id_fkey"
            columns: ["current_confirmation_proposal_id"]
            isOneToOne: false
            referencedRelation: "order_confirmation_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_feature_usage: {
        Row: {
          created_at: string
          establishment_id: string
          feature_key: string
          id: string
          period_end: string | null
          period_start: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          created_at?: string
          establishment_id: string
          feature_key: string
          id?: string
          period_end?: string | null
          period_start?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          created_at?: string
          establishment_id?: string
          feature_key?: string
          id?: string
          period_end?: string | null
          period_start?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          benefits: string[]
          billing_period: string | null
          created_at: string
          description: string | null
          features_json: Json
          id: string
          is_active: boolean
          limits_json: Json
          name: string
          position: number
          price_cents: number
          slug: string | null
        }
        Insert: {
          benefits?: string[]
          billing_period?: string | null
          created_at?: string
          description?: string | null
          features_json?: Json
          id?: string
          is_active?: boolean
          limits_json?: Json
          name: string
          position?: number
          price_cents?: number
          slug?: string | null
        }
        Update: {
          benefits?: string[]
          billing_period?: string | null
          created_at?: string
          description?: string | null
          features_json?: Json
          id?: string
          is_active?: boolean
          limits_json?: Json
          name?: string
          position?: number
          price_cents?: number
          slug?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_primary: boolean | null
          product_id: string
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          product_id: string
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_inventory_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          movement_type: string
          note: string | null
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type: string
          note?: string | null
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type?: string
          note?: string | null
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_groups: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_required: boolean | null
          max_choices: number | null
          min_choices: number | null
          name: string
          product_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          max_choices?: number | null
          min_choices?: number | null
          name: string
          product_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          max_choices?: number | null
          min_choices?: number | null
          name?: string
          product_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_option_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_available: boolean | null
          name: string
          option_group_id: string
          price: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_available?: boolean | null
          name: string
          option_group_id: string
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_available?: boolean | null
          name?: string
          option_group_id?: string
          price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_options_option_group_id_fkey"
            columns: ["option_group_id"]
            isOneToOne: false
            referencedRelation: "product_option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          min_quantity: number
          pause_on_zero: boolean
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          establishment_id: string
          id?: string
          min_quantity?: number
          pause_on_zero?: boolean
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          min_quantity?: number
          pause_on_zero?: boolean
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          additional_menu_category_ids: string[]
          allow_notes: boolean | null
          auto_pause_when_zero: boolean | null
          availability_rules_json: Json | null
          created_at: string
          description: string | null
          display_order: number | null
          establishment_id: string
          featured: boolean
          id: string
          image: string | null
          is_active: boolean | null
          is_available: boolean | null
          is_featured: boolean | null
          low_stock_threshold: number | null
          menu_category_id: string | null
          name: string
          options: Json
          popular: boolean
          preparation_time: number | null
          price: number
          promo: boolean
          promotion_ends_at: string | null
          promotion_label: string | null
          promotion_starts_at: string | null
          promotional_price: number | null
          removable: string[]
          short_description: string | null
          show_in_best_sellers: boolean | null
          show_in_promotions: boolean | null
          stock_quantity: number | null
          tags_json: Json | null
          track_stock: boolean | null
          updated_at: string
        }
        Insert: {
          additional_menu_category_ids?: string[]
          allow_notes?: boolean | null
          auto_pause_when_zero?: boolean | null
          availability_rules_json?: Json | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          establishment_id: string
          featured?: boolean
          id?: string
          image?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          menu_category_id?: string | null
          name: string
          options?: Json
          popular?: boolean
          preparation_time?: number | null
          price?: number
          promo?: boolean
          promotion_ends_at?: string | null
          promotion_label?: string | null
          promotion_starts_at?: string | null
          promotional_price?: number | null
          removable?: string[]
          short_description?: string | null
          show_in_best_sellers?: boolean | null
          show_in_promotions?: boolean | null
          stock_quantity?: number | null
          tags_json?: Json | null
          track_stock?: boolean | null
          updated_at?: string
        }
        Update: {
          additional_menu_category_ids?: string[]
          allow_notes?: boolean | null
          auto_pause_when_zero?: boolean | null
          availability_rules_json?: Json | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          establishment_id?: string
          featured?: boolean
          id?: string
          image?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          menu_category_id?: string | null
          name?: string
          options?: Json
          popular?: boolean
          preparation_time?: number | null
          price?: number
          promo?: boolean
          promotion_ends_at?: string | null
          promotion_label?: string | null
          promotion_starts_at?: string | null
          promotional_price?: number | null
          removable?: string[]
          short_description?: string | null
          show_in_best_sellers?: boolean | null
          show_in_promotions?: boolean | null
          stock_quantity?: number | null
          tags_json?: Json | null
          track_stock?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_menu_category_id_fkey"
            columns: ["menu_category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cpf: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
          ticket_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
          ticket_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author: string
          created_at: string
          establishment_id: string
          id: string
          photo: string | null
          rating: number
          reply: string | null
          reported_count: number
          status: Database["public"]["Enums"]["review_status"]
          text: string | null
        }
        Insert: {
          author: string
          created_at?: string
          establishment_id: string
          id?: string
          photo?: string | null
          rating: number
          reply?: string | null
          reported_count?: number
          status?: Database["public"]["Enums"]["review_status"]
          text?: string | null
        }
        Update: {
          author?: string
          created_at?: string
          establishment_id?: string
          id?: string
          photo?: string | null
          rating?: number
          reply?: string | null
          reported_count?: number
          status?: Database["public"]["Enums"]["review_status"]
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_invite_dismissals: {
        Row: {
          campaign: string
          dismissed_at: string
          id: string
          source: string | null
          tracking_code: string
        }
        Insert: {
          campaign?: string
          dismissed_at?: string
          id?: string
          source?: string | null
          tracking_code: string
        }
        Update: {
          campaign?: string
          dismissed_at?: string
          id?: string
          source?: string | null
          tracking_code?: string
        }
        Relationships: []
      }
      signup_invite_export_jobs: {
        Row: {
          admin_id: string
          created_at: string
          csv_path: string | null
          done: number
          download_url: string | null
          download_url_expires_at: string | null
          error: string | null
          filters: Json
          finished_at: string | null
          id: string
          progress_pct: number
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          csv_path?: string | null
          done?: number
          download_url?: string | null
          download_url_expires_at?: string | null
          error?: string | null
          filters?: Json
          finished_at?: string | null
          id?: string
          progress_pct?: number
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          csv_path?: string | null
          done?: number
          download_url?: string | null
          download_url_expires_at?: string | null
          error?: string | null
          filters?: Json
          finished_at?: string | null
          id?: string
          progress_pct?: number
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_categories: {
        Row: {
          emoji: string | null
          key: string
          label: string
          position: number
          visible: boolean
        }
        Insert: {
          emoji?: string | null
          key: string
          label: string
          position?: number
          visible?: boolean
        }
        Update: {
          emoji?: string | null
          key?: string
          label?: string
          position?: number
          visible?: boolean
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          cities: string[]
          faq: Json
          featured_ids: string[]
          hero_subtitle: string | null
          hero_title: string | null
          id: number
          neighborhoods: string[]
          privacy: string | null
          promo_ids: string[]
          terms: string | null
          updated_at: string
        }
        Insert: {
          cities?: string[]
          faq?: Json
          featured_ids?: string[]
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: number
          neighborhoods?: string[]
          privacy?: string | null
          promo_ids?: string[]
          terms?: string | null
          updated_at?: string
        }
        Update: {
          cities?: string[]
          faq?: Json
          featured_ids?: string[]
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: number
          neighborhoods?: string[]
          privacy?: string | null
          promo_ids?: string[]
          terms?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          delta: number
          establishment_id: string
          id: string
          product_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta: number
          establishment_id: string
          id?: string
          product_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta?: number
          establishment_id?: string
          id?: string
          product_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_audit_logs: {
        Row: {
          changed_by: string | null
          created_at: string
          establishment_id: string
          id: string
          new_plan_id: string | null
          old_plan_id: string | null
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          establishment_id: string
          id?: string
          new_plan_id?: string | null
          old_plan_id?: string | null
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          establishment_id?: string
          id?: string
          new_plan_id?: string | null
          old_plan_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_audit_logs_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      support_chat_messages: {
        Row: {
          attachments: Json
          chat_id: string
          created_at: string
          id: string
          message: string
          sender_id: string
          sender_role: Database["public"]["Enums"]["support_actor_role"]
        }
        Insert: {
          attachments?: Json
          chat_id: string
          created_at?: string
          id?: string
          message: string
          sender_id: string
          sender_role: Database["public"]["Enums"]["support_actor_role"]
        }
        Update: {
          attachments?: Json
          chat_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["support_actor_role"]
        }
        Relationships: [
          {
            foreignKeyName: "support_chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "support_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      support_chats: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          closed_at: string | null
          created_at: string
          establishment_id: string | null
          id: string
          last_message_at: string
          status: Database["public"]["Enums"]["support_chat_status"]
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          closed_at?: string | null
          created_at?: string
          establishment_id?: string | null
          id?: string
          last_message_at?: string
          status?: Database["public"]["Enums"]["support_chat_status"]
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          closed_at?: string | null
          created_at?: string
          establishment_id?: string | null
          id?: string
          last_message_at?: string
          status?: Database["public"]["Enums"]["support_chat_status"]
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_chats_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_attachments: {
        Row: {
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string | null
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id?: string | null
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string | null
          ticket_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "support_ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          attachments: Json
          created_at: string
          id: string
          is_internal_note: boolean
          message: string
          sender_id: string
          sender_role: Database["public"]["Enums"]["support_actor_role"]
          ticket_id: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          id?: string
          is_internal_note?: boolean
          message: string
          sender_id: string
          sender_role: Database["public"]["Enums"]["support_actor_role"]
          ticket_id: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          id?: string
          is_internal_note?: boolean
          message?: string
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["support_actor_role"]
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_admin_id: string | null
          category: Database["public"]["Enums"]["support_ticket_category"]
          closed_at: string | null
          created_at: string
          description: string | null
          establishment_id: string | null
          id: string
          last_message_at: string
          opened_by: string
          opened_by_role: Database["public"]["Enums"]["support_actor_role"]
          order_id: string | null
          priority: Database["public"]["Enums"]["support_ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_admin_id?: string | null
          category?: Database["public"]["Enums"]["support_ticket_category"]
          closed_at?: string | null
          created_at?: string
          description?: string | null
          establishment_id?: string | null
          id?: string
          last_message_at?: string
          opened_by: string
          opened_by_role: Database["public"]["Enums"]["support_actor_role"]
          order_id?: string | null
          priority?: Database["public"]["Enums"]["support_ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_admin_id?: string | null
          category?: Database["public"]["Enums"]["support_ticket_category"]
          closed_at?: string | null
          created_at?: string
          description?: string | null
          establishment_id?: string | null
          id?: string
          last_message_at?: string
          opened_by?: string
          opened_by_role?: Database["public"]["Enums"]["support_actor_role"]
          order_id?: string | null
          priority?: Database["public"]["Enums"]["support_ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_order_events: {
        Row: {
          created_at: string | null
          establishment_id: string | null
          event_type: string
          has_instructions: boolean | null
          has_media: boolean | null
          has_pins: boolean | null
          has_video: boolean | null
          id: string
          instructions_length: number | null
          media_count: number | null
          order_id: string | null
          pins_count: number | null
          tracking_code: string | null
          visual_reference_source: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string | null
          establishment_id?: string | null
          event_type: string
          has_instructions?: boolean | null
          has_media?: boolean | null
          has_pins?: boolean | null
          has_video?: boolean | null
          id?: string
          instructions_length?: number | null
          media_count?: number | null
          order_id?: string | null
          pins_count?: number | null
          tracking_code?: string | null
          visual_reference_source?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string | null
          establishment_id?: string | null
          event_type?: string
          has_instructions?: boolean | null
          has_media?: boolean | null
          has_pins?: boolean | null
          has_video?: boolean | null
          id?: string
          instructions_length?: number | null
          media_count?: number | null
          order_id?: string | null
          pins_count?: number | null
          tracking_code?: string | null
          visual_reference_source?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_order_events_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_send_logs: {
        Row: {
          establishment_id: string
          id: string
          kind: string
          order_id: string
          sent_at: string
          sent_by: string | null
          tracking_code: string | null
          whatsapp_message: string | null
        }
        Insert: {
          establishment_id: string
          id?: string
          kind?: string
          order_id: string
          sent_at?: string
          sent_by?: string | null
          tracking_code?: string | null
          whatsapp_message?: string | null
        }
        Update: {
          establishment_id?: string
          id?: string
          kind?: string
          order_id?: string
          sent_at?: string
          sent_by?: string | null
          tracking_code?: string | null
          whatsapp_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_send_logs_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_send_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _assert_estab_member: { Args: { _order_id: string }; Returns: string }
      accept_order_proposal: { Args: { _proposal_id: string }; Returns: Json }
      accept_order_proposal_by_tracking: {
        Args: { _code: string; _proposal_id: string }
        Returns: Json
      }
      admin_find_user_by_email: { Args: { _email: string }; Returns: string }
      can_manage: { Args: { _user_id: string }; Returns: boolean }
      can_user_access_order: { Args: { order_uuid: string }; Returns: boolean }
      claim_support_chat: { Args: { _chat_id: string }; Returns: Json }
      create_notification:
        | {
            Args: {
              p_data?: Json
              p_establishment_id?: string
              p_message: string
              p_title: string
              p_type?: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_data?: Json
              p_establishment_id?: string
              p_message: string
              p_related_order_id?: string
              p_related_support_chat_id?: string
              p_related_ticket_id?: string
              p_title: string
              p_type?: string
              p_user_id: string
            }
            Returns: string
          }
      customer_cancel_order: {
        Args: { _code: string; _reason?: string }
        Returns: Json
      }
      ensure_official_admin: { Args: never; Returns: undefined }
      gen_tracking_code: { Args: never; Returns: string }
      get_active_proposal_by_tracking: {
        Args: { _code: string }
        Returns: {
          accepted_at: string | null
          business_note: string | null
          canceled_at: string | null
          created_at: string
          created_by: string | null
          customer_response_note: string | null
          establishment_id: string
          estimated_delivery_time_min: number | null
          estimated_preparation_time_min: number | null
          expires_at: string | null
          id: string
          order_id: string
          proposed_delivery_fee: number | null
          proposed_discount: number | null
          proposed_extra_fee: number | null
          proposed_subtotal: number | null
          proposed_total: number | null
          rejected_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "order_confirmation_proposals"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_establishment_plan_info: {
        Args: { _estab_id: string }
        Returns: Json
      }
      get_order_by_tracking: {
        Args: { _code: string }
        Returns: {
          address_id: string
          created_at: string
          customer_name: string
          delivery_fee: number
          establishment_id: string
          establishment_logo: string
          establishment_name: string
          establishment_reply: string
          establishment_slug: string
          establishment_whatsapp: string
          estimated_minutes: number
          final_total: number
          id: string
          items: Json
          notes: string
          payment_method: string
          status: string
          status_history: Json
          subtotal: number
          total: number
          tracking_code: string
          updated_at: string
        }[]
      }
      get_order_messages_by_tracking: {
        Args: { _code: string }
        Returns: {
          attachments: Json
          created_at: string
          establishment_id: string
          id: string
          message: string
          order_id: string
          read_at: string
          sender_type: string
        }[]
      }
      get_order_public_events: { Args: { _code: string }; Returns: Json }
      get_share_link_by_token: { Args: { _token: string }; Returns: Json }
      get_visual_reference_by_token: { Args: { _token: string }; Returns: Json }
      has_feature: {
        Args: { _estab_id: string; _feature: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_banner_metric: {
        Args: { _banner_id: string; _field: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_establishment_member: {
        Args: { _estab_id: string; _user_id: string }
        Returns: boolean
      }
      log_action: {
        Args: {
          _action: string
          _meta?: Json
          _target_id: string
          _target_type: string
        }
        Returns: undefined
      }
      log_whatsapp_send: {
        Args: { _code: string; _kind?: string; _message: string }
        Returns: Json
      }
      make_unique_establishment_slug: {
        Args: { _name: string; _self_id: string }
        Returns: string
      }
      mark_order_availability: {
        Args: { _note?: string; _order_id: string }
        Returns: Json
      }
      mark_order_eta: {
        Args: { _minutes: number; _note?: string; _order_id: string }
        Returns: Json
      }
      mark_order_final_value: {
        Args: { _note?: string; _order_id: string; _total: number }
        Returns: Json
      }
      register_whatsapp_resend: { Args: { _code: string }; Returns: Json }
      reject_order_proposal: {
        Args: { _note?: string; _proposal_id: string }
        Returns: Json
      }
      reject_order_proposal_by_tracking: {
        Args: { _code: string; _note?: string; _proposal_id: string }
        Returns: Json
      }
      search_signup_invites: {
        Args: {
          _campaign?: string
          _dir?: string
          _end: string
          _limit?: number
          _offset?: number
          _q?: string
          _sort?: string
          _start: string
        }
        Returns: {
          campaign: string
          dismissed_at: string
          id: string
          source: string
          total_count: number
          tracking_code: string
        }[]
      }
      seed_initial_data: { Args: never; Returns: undefined }
      send_order_message_by_tracking: {
        Args: { _code: string; _message: string }
        Returns: Json
      }
      slugify: { Args: { _t: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
      unaccent_safe: { Args: { _t: string }; Returns: string }
      user_is_order_customer: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_order_establishment: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      user_role_in_establishment: {
        Args: { _estab_id: string; _user_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin_operacional"
        | "analista_comercial"
        | "suporte"
        | "establishment_owner"
      banner_placement:
        | "home_top"
        | "home_mid"
        | "category_top"
        | "category_mid"
        | "establishment_menu"
        | "loja_top"
      delivery_confidence_level: "high" | "medium" | "low"
      delivery_fee_status: "free" | "estimated" | "to_confirm" | "unavailable"
      delivery_model:
        | "fixed"
        | "by_region"
        | "to_confirm"
        | "free"
        | "pickup_only"
        | "by_region_manual"
        | "no_delivery"
        | "dine_in_only"
      delivery_region_status: "ativo" | "inativo" | "nao_atendida"
      establishment_status: "pendente" | "ativo" | "suspenso" | "inativo"
      event_type:
        | "pageview"
        | "establishment_view"
        | "product_view"
        | "cart_add"
        | "whatsapp_send"
        | "review_submit"
      favorite_kind: "establishment" | "product"
      menu_type: "essencial" | "exclusivo"
      order_status:
        | "waiting_business_confirmation"
        | "confirmed_by_business"
        | "preparing"
        | "ready_for_pickup"
        | "out_for_delivery"
        | "delivered"
        | "canceled_by_customer"
        | "canceled_by_business"
        | "customer_not_responding"
        | "difficult_address"
        | "needs_more_reference"
        | "not_completed"
        | "unknown"
      report_status: "pendente" | "resolvido" | "descartado"
      review_status: "pendente" | "aprovado" | "reprovado"
      support_actor_role: "customer" | "establishment" | "admin" | "system"
      support_chat_status: "waiting" | "active" | "closed"
      support_ticket_category:
        | "order_issue"
        | "delivery_issue"
        | "payment_issue"
        | "account_issue"
        | "establishment_issue"
        | "report_followup"
        | "feature_request"
        | "other"
        | "complaint"
        | "report_establishment"
        | "report_customer"
        | "report_content"
        | "technical_problem"
        | "subscription_problem"
      support_ticket_priority: "low" | "normal" | "high" | "urgent"
      support_ticket_status:
        | "open"
        | "in_progress"
        | "waiting_user"
        | "resolved"
        | "closed"
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
      app_role: [
        "super_admin",
        "admin_operacional",
        "analista_comercial",
        "suporte",
        "establishment_owner",
      ],
      banner_placement: [
        "home_top",
        "home_mid",
        "category_top",
        "category_mid",
        "establishment_menu",
        "loja_top",
      ],
      delivery_confidence_level: ["high", "medium", "low"],
      delivery_fee_status: ["free", "estimated", "to_confirm", "unavailable"],
      delivery_model: [
        "fixed",
        "by_region",
        "to_confirm",
        "free",
        "pickup_only",
        "by_region_manual",
        "no_delivery",
        "dine_in_only",
      ],
      delivery_region_status: ["ativo", "inativo", "nao_atendida"],
      establishment_status: ["pendente", "ativo", "suspenso", "inativo"],
      event_type: [
        "pageview",
        "establishment_view",
        "product_view",
        "cart_add",
        "whatsapp_send",
        "review_submit",
      ],
      favorite_kind: ["establishment", "product"],
      menu_type: ["essencial", "exclusivo"],
      order_status: [
        "waiting_business_confirmation",
        "confirmed_by_business",
        "preparing",
        "ready_for_pickup",
        "out_for_delivery",
        "delivered",
        "canceled_by_customer",
        "canceled_by_business",
        "customer_not_responding",
        "difficult_address",
        "needs_more_reference",
        "not_completed",
        "unknown",
      ],
      report_status: ["pendente", "resolvido", "descartado"],
      review_status: ["pendente", "aprovado", "reprovado"],
      support_actor_role: ["customer", "establishment", "admin", "system"],
      support_chat_status: ["waiting", "active", "closed"],
      support_ticket_category: [
        "order_issue",
        "delivery_issue",
        "payment_issue",
        "account_issue",
        "establishment_issue",
        "report_followup",
        "feature_request",
        "other",
        "complaint",
        "report_establishment",
        "report_customer",
        "report_content",
        "technical_problem",
        "subscription_problem",
      ],
      support_ticket_priority: ["low", "normal", "high", "urgent"],
      support_ticket_status: [
        "open",
        "in_progress",
        "waiting_user",
        "resolved",
        "closed",
      ],
    },
  },
} as const
