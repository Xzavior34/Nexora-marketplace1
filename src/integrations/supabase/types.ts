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
      admin_audit_log: {
        Row: {
          action: string
          admin_email: string
          admin_id: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_email: string
          admin_id: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          admin_id?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_fees: {
        Row: {
          admin_account: string | null
          amount_kobo: number
          created_at: string
          id: string
          reference: string | null
          source_user_id: string
          status: string
          transaction_type: string
        }
        Insert: {
          admin_account?: string | null
          amount_kobo: number
          created_at?: string
          id?: string
          reference?: string | null
          source_user_id: string
          status?: string
          transaction_type: string
        }
        Update: {
          admin_account?: string | null
          amount_kobo?: number
          created_at?: string
          id?: string
          reference?: string | null
          source_user_id?: string
          status?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_fees_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_fees_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appeals: {
        Row: {
          created_at: string | null
          dispute_id: string | null
          id: string
          poster_id: string | null
          reason: string
        }
        Insert: {
          created_at?: string | null
          dispute_id?: string | null
          id?: string
          poster_id?: string | null
          reason: string
        }
        Update: {
          created_at?: string | null
          dispute_id?: string | null
          id?: string
          poster_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeals_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_poster_id_fkey"
            columns: ["poster_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_poster_id_fkey"
            columns: ["poster_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          id: string
          reason: string
          reported_id: string | null
          reporter_id: string | null
          resolved_at: string | null
          status: string | null
          task_id: string | null
          type: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          reason: string
          reported_id?: string | null
          reporter_id?: string | null
          resolved_at?: string | null
          status?: string | null
          task_id?: string | null
          type?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          reason?: string
          reported_id?: string | null
          reporter_id?: string | null
          resolved_at?: string | null
          status?: string | null
          task_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_state_log: {
        Row: {
          amount_kobo: number | null
          changed_at: string
          escrow_id: string
          id: string
          new_status: string
          old_status: string | null
          payee_id: string | null
          payer_id: string | null
          reference: string | null
          task_id: string | null
          wallet_transaction_id: string | null
        }
        Insert: {
          amount_kobo?: number | null
          changed_at?: string
          escrow_id: string
          id?: string
          new_status: string
          old_status?: string | null
          payee_id?: string | null
          payer_id?: string | null
          reference?: string | null
          task_id?: string | null
          wallet_transaction_id?: string | null
        }
        Update: {
          amount_kobo?: number | null
          changed_at?: string
          escrow_id?: string
          id?: string
          new_status?: string
          old_status?: string | null
          payee_id?: string | null
          payer_id?: string | null
          reference?: string | null
          task_id?: string | null
          wallet_transaction_id?: string | null
        }
        Relationships: []
      }
      escrow_transactions: {
        Row: {
          amount: number | null
          amount_kobo: number
          created_at: string
          id: string
          payee_id: string
          payer_id: string
          platform_fee_kobo: number
          poster_id: string | null
          product_id: string | null
          released_at: string | null
          squad_reference: string | null
          squad_transfer_code: string | null
          status: Database["public"]["Enums"]["escrow_status"]
          task_id: string | null
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          amount?: number | null
          amount_kobo: number
          created_at?: string
          id?: string
          payee_id: string
          payer_id: string
          platform_fee_kobo?: number
          poster_id?: string | null
          product_id?: string | null
          released_at?: string | null
          squad_reference?: string | null
          squad_transfer_code?: string | null
          status?: Database["public"]["Enums"]["escrow_status"]
          task_id?: string | null
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          amount?: number | null
          amount_kobo?: number
          created_at?: string
          id?: string
          payee_id?: string
          payer_id?: string
          platform_fee_kobo?: number
          poster_id?: string | null
          product_id?: string | null
          released_at?: string | null
          squad_reference?: string | null
          squad_transfer_code?: string | null
          status?: Database["public"]["Enums"]["escrow_status"]
          task_id?: string | null
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_task_relation"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          amount_kobo: number
          created_at: string
          eligibility_score: number
          id: string
          reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_kobo: number
          created_at?: string
          eligibility_score?: number
          id?: string
          reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_kobo?: number
          created_at?: string
          eligibility_score?: number
          id?: string
          reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          application_id: string | null
          content: string
          created_at: string
          id: string
          recipient_id: string | null
          sender_id: string
          task_id: string | null
        }
        Insert: {
          application_id?: string | null
          content: string
          created_at?: string
          id?: string
          recipient_id?: string | null
          sender_id: string
          task_id?: string | null
        }
        Update: {
          application_id?: string | null
          content?: string
          created_at?: string
          id?: string
          recipient_id?: string | null
          sender_id?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "task_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_winners: {
        Row: {
          created_at: string | null
          doer_name: string
          id: string
          poster_name: string
        }
        Insert: {
          created_at?: string | null
          doer_name: string
          id?: string
          poster_name: string
        }
        Update: {
          created_at?: string | null
          doer_name?: string
          id?: string
          poster_name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_revenue: {
        Row: {
          amount_kobo: number
          created_at: string
          escrow_id: string
          id: string
        }
        Insert: {
          amount_kobo: number
          created_at?: string
          escrow_id: string
          id?: string
        }
        Update: {
          amount_kobo?: number
          created_at?: string
          escrow_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_revenue_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_orders: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          platform_fee_kobo: number
          product_id: string
          quantity: number
          seller_id: string
          shipping_address: string | null
          status: string
          total_kobo: number
          tracking_info: string | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          platform_fee_kobo: number
          product_id: string
          quantity?: number
          seller_id: string
          shipping_address?: string | null
          status?: string
          total_kobo: number
          tracking_info?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          platform_fee_kobo?: number
          product_id?: string
          quantity?: number
          seller_id?: string
          shipping_address?: string | null
          status?: string
          total_kobo?: number
          tracking_info?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string
          download_url: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          is_available: boolean | null
          price_kobo: number
          product_type: string
          seller_id: string
          seller_phone: string | null
          shipping_info: string | null
          stock: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          download_url?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_available?: boolean | null
          price_kobo: number
          product_type?: string
          seller_id: string
          seller_phone?: string | null
          shipping_info?: string | null
          stock?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          download_url?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_available?: boolean | null
          price_kobo?: number
          product_type?: string
          seller_id?: string
          seller_phone?: string | null
          shipping_info?: string | null
          stock?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_name: string | null
          account_number: string | null
          auto_save_percentage: number
          avatar_url: string | null
          average_rating: number | null
          bank_name: string | null
          bio: string | null
          completed_gigs: number | null
          created_at: string
          email: string
          fake_completed_gigs: number | null
          fake_posted_gigs: number | null
          fake_reviews: number | null
          full_name: string | null
          has_completed_onboarding: boolean
          has_edited_referral: boolean | null
          id: string
          intro_video_url: string | null
          is_admin: boolean | null
          is_ambassador: boolean
          is_verified: boolean
          last_seen_at: string | null
          phone: string | null
          recipient_code: string | null
          referral_code: string | null
          referred_by: string | null
          skills: string[] | null
          spin_tickets: number | null
          university: string | null
          updated_at: string
          vault_balance: number
          verification_code: string | null
          verification_expires_at: string | null
          virtual_account_number: string | null
          virtual_bank_name: string | null
          wallet_balance: number
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          auto_save_percentage?: number
          avatar_url?: string | null
          average_rating?: number | null
          bank_name?: string | null
          bio?: string | null
          completed_gigs?: number | null
          created_at?: string
          email: string
          fake_completed_gigs?: number | null
          fake_posted_gigs?: number | null
          fake_reviews?: number | null
          full_name?: string | null
          has_completed_onboarding?: boolean
          has_edited_referral?: boolean | null
          id: string
          intro_video_url?: string | null
          is_admin?: boolean | null
          is_ambassador?: boolean
          is_verified?: boolean
          last_seen_at?: string | null
          phone?: string | null
          recipient_code?: string | null
          referral_code?: string | null
          referred_by?: string | null
          skills?: string[] | null
          spin_tickets?: number | null
          university?: string | null
          updated_at?: string
          vault_balance?: number
          verification_code?: string | null
          verification_expires_at?: string | null
          virtual_account_number?: string | null
          virtual_bank_name?: string | null
          wallet_balance?: number
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          auto_save_percentage?: number
          avatar_url?: string | null
          average_rating?: number | null
          bank_name?: string | null
          bio?: string | null
          completed_gigs?: number | null
          created_at?: string
          email?: string
          fake_completed_gigs?: number | null
          fake_posted_gigs?: number | null
          fake_reviews?: number | null
          full_name?: string | null
          has_completed_onboarding?: boolean
          has_edited_referral?: boolean | null
          id?: string
          intro_video_url?: string | null
          is_admin?: boolean | null
          is_ambassador?: boolean
          is_verified?: boolean
          last_seen_at?: string | null
          phone?: string | null
          recipient_code?: string | null
          referral_code?: string | null
          referred_by?: string | null
          skills?: string[] | null
          spin_tickets?: number | null
          university?: string | null
          updated_at?: string
          vault_balance?: number
          verification_code?: string | null
          verification_expires_at?: string | null
          virtual_account_number?: string | null
          virtual_bank_name?: string | null
          wallet_balance?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          target_user_id: string | null
          task_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          target_user_id?: string | null
          task_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          target_user_id?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_gigs: {
        Row: {
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_gigs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_gigs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_gigs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suspicious_activity: {
        Row: {
          activity_type: string
          created_at: string
          details: Json | null
          id: string
          severity: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          details?: Json | null
          id?: string
          severity?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          severity?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      task_applications: {
        Row: {
          applicant_id: string
          created_at: string
          id: string
          status: string
          task_id: string
        }
        Insert: {
          applicant_id: string
          created_at?: string
          id?: string
          status?: string
          task_id: string
        }
        Update: {
          applicant_id?: string
          created_at?: string
          id?: string
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_applications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          attachment_url: string | null
          category: string
          created_at: string
          deadline: string | null
          description: string
          id: string
          location: string | null
          poster_id: string
          price_kobo: number
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          assignee_id?: string | null
          attachment_url?: string | null
          category: string
          created_at?: string
          deadline?: string | null
          description: string
          id?: string
          location?: string | null
          poster_id: string
          price_kobo: number
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          assignee_id?: string | null
          attachment_url?: string | null
          category?: string
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
          location?: string | null
          poster_id?: string
          price_kobo?: number
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_poster_id_fkey"
            columns: ["poster_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_poster_id_fkey"
            columns: ["poster_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_audit_log: {
        Row: {
          actor_role: string | null
          changed_at: string | null
          id: string
          new_balance_kobo: number | null
          old_balance_kobo: number | null
          source: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          actor_role?: string | null
          changed_at?: string | null
          id?: string
          new_balance_kobo?: number | null
          old_balance_kobo?: number | null
          source?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          actor_role?: string | null
          changed_at?: string | null
          id?: string
          new_balance_kobo?: number | null
          old_balance_kobo?: number | null
          source?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_topups: {
        Row: {
          amount_kobo: number
          created_at: string
          id: string
          squad_reference: string
          status: string
          transaction_status: string | null
          user_id: string
        }
        Insert: {
          amount_kobo: number
          created_at?: string
          id?: string
          squad_reference: string
          status?: string
          transaction_status?: string | null
          user_id: string
        }
        Update: {
          amount_kobo?: number
          created_at?: string
          id?: string
          squad_reference?: string
          status?: string
          transaction_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_topups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_topups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount_kobo: number
          balance_after_kobo: number
          created_at: string
          description: string | null
          escrow_id: string | null
          id: string
          reference: string | null
          status: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount_kobo: number
          balance_after_kobo: number
          created_at?: string
          description?: string | null
          escrow_id?: string | null
          id?: string
          reference?: string | null
          status?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount_kobo?: number
          balance_after_kobo?: number
          created_at?: string
          description?: string | null
          escrow_id?: string | null
          id?: string
          reference?: string | null
          status?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          account_name: string
          account_number: string
          admin_notes: string | null
          amount_kobo: number
          bank_name: string
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          admin_notes?: string | null
          amount_kobo: number
          bank_name: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          admin_notes?: string | null
          amount_kobo?: number
          bank_name?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard_stats: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string | null
          total_doer_gigs: number | null
          total_posted_gigs: number | null
          total_reviews: number | null
          university: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          total_doer_gigs?: never
          total_posted_gigs?: never
          total_reviews?: never
          university?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          total_doer_gigs?: never
          total_posted_gigs?: never
          total_reviews?: never
          university?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_spin_ticket: { Args: { p_user_id: string }; Returns: undefined }
      admin_delete_user: { Args: { p_user_id: string }; Returns: Json }
      admin_get_monitoring_stats: { Args: never; Returns: Json }
      admin_process_withdrawal: {
        Args: { p_action: string; p_request_id: string }
        Returns: Json
      }
      admin_reward_user: {
        Args: { reward_amount: number; target_user_id: string }
        Returns: Json
      }
      admin_send_direct_message: {
        Args: {
          p_admin_id: string
          p_message_content: string
          p_user_id: string
        }
        Returns: undefined
      }
      admin_send_inbox_message: {
        Args: {
          p_admin_id: string
          p_message_content: string
          p_user_id: string
        }
        Returns: string
      }
      admin_send_message_bypass: {
        Args: { p_content: string; p_recipient_id: string; p_sender_id: string }
        Returns: undefined
      }
      admin_settle_dispute: {
        Args: { p_dispute_id: string; p_resolution: string }
        Returns: undefined
      }
      admin_settle_dispute_v2: {
        Args: { p_dispute_id: string; p_resolution: string }
        Returns: Json
      }
      ambassador_first_gig_bonus: {
        Args: { p_gig_price_kobo: number; p_worker_id: string }
        Returns: Json
      }
      apply_referral_code: {
        Args: { new_user_id: string; ref_code: string }
        Returns: undefined
      }
      award_spin_prize: {
        Args: { p_amount_kobo: number; p_user_id: string }
        Returns: undefined
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      cancel_and_refund_escrow: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: Json
      }
      check_referral_milestone: {
        Args: { p_referrer_id: string }
        Returns: Json
      }
      cleanup_old_data: { Args: never; Returns: undefined }
      dispute_product_escrow: {
        Args: { p_buyer_id: string; p_product_id: string; p_reason: string }
        Returns: Json
      }
      freeze_poster_funds: {
        Args: { p_poster_id: string; p_reporter_id: string; p_task_id: string }
        Returns: Json
      }
      get_my_profile: {
        Args: never
        Returns: {
          account_name: string | null
          account_number: string | null
          auto_save_percentage: number
          avatar_url: string | null
          average_rating: number | null
          bank_name: string | null
          bio: string | null
          completed_gigs: number | null
          created_at: string
          email: string
          fake_completed_gigs: number | null
          fake_posted_gigs: number | null
          fake_reviews: number | null
          full_name: string | null
          has_completed_onboarding: boolean
          has_edited_referral: boolean | null
          id: string
          intro_video_url: string | null
          is_admin: boolean | null
          is_ambassador: boolean
          is_verified: boolean
          last_seen_at: string | null
          phone: string | null
          recipient_code: string | null
          referral_code: string | null
          referred_by: string | null
          skills: string[] | null
          spin_tickets: number | null
          university: string | null
          updated_at: string
          vault_balance: number
          verification_code: string | null
          verification_expires_at: string | null
          virtual_account_number: string | null
          virtual_bank_name: string | null
          wallet_balance: number
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_smart_matches: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          category: string
          created_at: string
          deadline: string
          description: string
          id: string
          location: string
          match_score: number
          poster_avatar: string
          poster_id: string
          poster_name: string
          poster_university: string
          price_kobo: number
          title: string
        }[]
      }
      get_squad_trust_score: { Args: { _user_id: string }; Returns: number }
      get_user_email_internal: { Args: { p_user_id: string }; Returns: string }
      hire_and_escrow: {
        Args: {
          p_application_id?: string
          p_assignee_id: string
          p_poster_id: string
          p_task_id: string
        }
        Returns: Json
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      initiate_manual_withdrawal: {
        Args: {
          p_account_name: string
          p_account_number: string
          p_amount_kobo: number
          p_bank_name: string
        }
        Returns: Json
      }
      instant_wallet_deposit: { Args: { p_amount_kobo: number }; Returns: Json }
      live_dispute_escrow: {
        Args: { p_escrow_id: string; p_reason?: string }
        Returns: Json
      }
      live_hire_and_lock_escrow: {
        Args: { p_amount_kobo: number; p_payee_id: string; p_task_id: string }
        Returns: Json
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_after?: Json
          p_before?: Json
          p_metadata?: Json
          p_target_id?: string
          p_target_type?: string
        }
        Returns: string
      }
      process_ambassador_bonus: {
        Args: { p_user_id: string; p_withdrawal_amount_kobo: number }
        Returns: undefined
      }
      process_ambassador_reward: {
        Args: { p_amount_kobo: number; p_user_id: string }
        Returns: undefined
      }
      process_withdrawal: {
        Args: {
          p_account_name: string
          p_account_number: string
          p_amount_kobo: number
          p_bank_name: string
          p_user_id: string
        }
        Returns: Json
      }
      process_withdrawal_request: {
        Args: {
          p_account_name: string
          p_account_number: string
          p_amount_kobo: number
          p_bank_name: string
          p_user_id: string
        }
        Returns: string
      }
      purchase_product_atomic: {
        Args: { p_buyer_id: string; p_product_id: string }
        Returns: Json
      }
      purchase_product_escrow: {
        Args: { p_buyer_id: string; p_product_id: string; p_seller_id: string }
        Returns: Json
      }
      quick_ai_credit_scan: { Args: { _user_id?: string }; Returns: Json }
      refund_withdrawal: {
        Args: { p_admin_notes?: string; p_request_id: string }
        Returns: Json
      }
      release_escrow_atomic: {
        Args: { p_action: string; p_caller: string; p_escrow_id: string }
        Returns: Json
      }
      release_product_escrow: {
        Args: { p_buyer_id: string; p_product_id: string }
        Returns: Json
      }
      request_micro_loan: { Args: { p_amount_kobo: number }; Returns: Json }
      resolve_frozen_wallet_dispute: {
        Args: { p_dispute_id: string; p_resolution: string }
        Returns: undefined
      }
      secure_mark_disputed: { Args: { p_task_id: string }; Returns: undefined }
      secure_spin_wheel: { Args: { p_user_id: string }; Returns: Json }
      submit_live_verification: { Args: { p_nin_bvn?: string }; Returns: Json }
      text_to_bytea: { Args: { data: string }; Returns: string }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      use_spin_ticket: { Args: { p_user_id: string }; Returns: boolean }
      vault_deposit: { Args: { p_amount_kobo: number }; Returns: Json }
      vault_withdraw: { Args: { p_amount_kobo: number }; Returns: Json }
    }
    Enums: {
      escrow_status: "pending" | "held" | "released" | "refunded" | "disputed"
      task_status:
        | "open"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "disputed"
      transaction_type:
        | "deposit"
        | "escrow_hold"
        | "escrow_release"
        | "commission"
        | "withdrawal"
        | "refund"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      escrow_status: ["pending", "held", "released", "refunded", "disputed"],
      task_status: [
        "open",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
        "disputed",
      ],
      transaction_type: [
        "deposit",
        "escrow_hold",
        "escrow_release",
        "commission",
        "withdrawal",
        "refund",
      ],
    },
  },
} as const
