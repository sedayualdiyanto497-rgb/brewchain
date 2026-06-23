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
      app_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_roles_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      loyalty_ledger: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          points: number
          reason: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          points: number
          reason: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          points?: number
          reason?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          color: string
          display_name: string
          level: Database["public"]["Enums"]["membership_level"]
          min_spend_idr: number
          perks: Json
        }
        Insert: {
          color: string
          display_name: string
          level: Database["public"]["Enums"]["membership_level"]
          min_spend_idr: number
          perks?: Json
        }
        Update: {
          color?: string
          display_name?: string
          level?: Database["public"]["Enums"]["membership_level"]
          min_spend_idr?: number
          perks?: Json
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notif_type"]
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type: Database["public"]["Enums"]["notif_type"]
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notif_type"]
          wallet_address?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          subtotal_idr: number
          unit_price_idr: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          subtotal_idr: number
          unit_price_idr: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          subtotal_idr?: number
          unit_price_idr?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          discount_idr: number
          id: string
          notes: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal_idr: number
          tax_idr: number
          total_idr: number
          total_sol: number
          updated_at: string
          voucher_code: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string
          discount_idr?: number
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_idr: number
          tax_idr?: number
          total_idr: number
          total_sol: number
          updated_at?: string
          voucher_code?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string
          discount_idr?: number
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_idr?: number
          tax_idr?: number
          total_idr?: number
          total_sol?: number
          updated_at?: string
          voucher_code?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          composition: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_bestseller: boolean
          name: string
          nutrition: Json | null
          origin: string | null
          price_idr: number
          price_sol: number
          promo_pct: number
          rating_avg: number
          rating_count: number
          slug: string
          stock: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          composition?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_bestseller?: boolean
          name: string
          nutrition?: Json | null
          origin?: string | null
          price_idr: number
          price_sol: number
          promo_pct?: number
          rating_avg?: number
          rating_count?: number
          slug: string
          stock?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          composition?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_bestseller?: boolean
          name?: string
          nutrition?: Json | null
          origin?: string | null
          price_idr?: number
          price_sol?: number
          promo_pct?: number
          rating_avg?: number
          rating_count?: number
          slug?: string
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          last_signed_at: string | null
          membership_level: Database["public"]["Enums"]["membership_level"]
          nickname: string | null
          total_orders: number
          total_points: number
          total_spent_idr: number
          updated_at: string
          wallet_address: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          last_signed_at?: string | null
          membership_level?: Database["public"]["Enums"]["membership_level"]
          nickname?: string | null
          total_orders?: number
          total_points?: number
          total_spent_idr?: number
          updated_at?: string
          wallet_address: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          last_signed_at?: string | null
          membership_level?: Database["public"]["Enums"]["membership_level"]
          nickname?: string | null
          total_orders?: number
          total_points?: number
          total_spent_idr?: number
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string | null
          photo_url: string | null
          product_id: string
          rating: number
          wallet_address: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          photo_url?: string | null
          product_id: string
          rating: number
          wallet_address: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          photo_url?: string | null
          product_id?: string
          rating?: number
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          block_time: number | null
          created_at: string
          explorer_url: string | null
          id: string
          network: string
          order_id: string | null
          recipient_address: string
          status: Database["public"]["Enums"]["tx_status"]
          total_sol: number
          tx_signature: string | null
          wallet_address: string
        }
        Insert: {
          block_time?: number | null
          created_at?: string
          explorer_url?: string | null
          id?: string
          network?: string
          order_id?: string | null
          recipient_address: string
          status?: Database["public"]["Enums"]["tx_status"]
          total_sol: number
          tx_signature?: string | null
          wallet_address: string
        }
        Update: {
          block_time?: number | null
          created_at?: string
          explorer_url?: string | null
          id?: string
          network?: string
          order_id?: string | null
          recipient_address?: string
          status?: Database["public"]["Enums"]["tx_status"]
          total_sol?: number
          tx_signature?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_pct: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          min_order_idr: number
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_pct: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          min_order_idr?: number
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_pct?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          min_order_idr?: number
          used_count?: number
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          id: string
          product_id: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "customer" | "cashier" | "admin"
      membership_level: "bronze" | "silver" | "gold" | "platinum"
      notif_type:
        | "wallet_connected"
        | "payment_success"
        | "order_accepted"
        | "preparing"
        | "ready"
        | "completed"
        | "promo"
      order_status:
        | "pending"
        | "paid"
        | "preparing"
        | "ready"
        | "completed"
        | "cancelled"
      payment_method: "solana" | "qris" | "bank_transfer"
      tx_status: "pending" | "confirmed" | "failed"
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
      app_role: ["customer", "cashier", "admin"],
      membership_level: ["bronze", "silver", "gold", "platinum"],
      notif_type: [
        "wallet_connected",
        "payment_success",
        "order_accepted",
        "preparing",
        "ready",
        "completed",
        "promo",
      ],
      order_status: [
        "pending",
        "paid",
        "preparing",
        "ready",
        "completed",
        "cancelled",
      ],
      payment_method: ["solana", "qris", "bank_transfer"],
      tx_status: ["pending", "confirmed", "failed"],
    },
  },
} as const
