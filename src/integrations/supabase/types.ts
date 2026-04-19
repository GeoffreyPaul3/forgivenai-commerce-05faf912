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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          commission_rate: number | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          referral_code: string
          status: string | null
          total_commission: number | null
          total_sales: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          referral_code: string
          status?: string | null
          total_commission?: number | null
          total_sales?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          commission_rate?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          referral_code?: string
          status?: string | null
          total_commission?: number | null
          total_sales?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          agent_id: string
          amount: number
          created_at: string
          id: string
          order_id: string
          status: string
        }
        Insert: {
          agent_id: string
          amount: number
          created_at?: string
          id?: string
          order_id: string
          status?: string
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          body: string | null
          created_at: string
          id: string
          media_url: string | null
          metadata: Json | null
          product_id: string | null
          status: string | null
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          media_url?: string | null
          metadata?: Json | null
          product_id?: string | null
          status?: string | null
          title?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          media_url?: string | null
          metadata?: Json | null
          product_id?: string | null
          status?: string | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          channel: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          last_message_at: string | null
          metadata: Json | null
          status: string | null
          updated_at: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          customer_status: string | null
          created_at: string
          email: string | null
          first_agent_id: string | null
          id: string
          location: string | null
          name: string | null
          phone: string
          total_orders: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          customer_status?: string | null
          created_at?: string
          email?: string | null
          first_agent_id?: string | null
          id?: string
          location?: string | null
          name?: string | null
          phone: string
          total_orders?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          customer_status?: string | null
          created_at?: string
          email?: string | null
          first_agent_id?: string | null
          id?: string
          location?: string | null
          name?: string | null
          phone?: string
          total_orders?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_first_agent_id_fkey"
            columns: ["first_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      influencers: {
        Row: {
          avatar_url: string | null
          catchphrases: string[] | null
          created_at: string
          ethnicity: string | null
          gender: string | null
          id: string
          metadata: Json | null
          name: string
          niche: string | null
          setting: string | null
          tone: string | null
          updated_at: string
          voice_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          catchphrases?: string[] | null
          created_at?: string
          ethnicity?: string | null
          gender?: string | null
          id?: string
          metadata?: Json | null
          name: string
          niche?: string | null
          setting?: string | null
          tone?: string | null
          updated_at?: string
          voice_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          catchphrases?: string[] | null
          created_at?: string
          ethnicity?: string | null
          gender?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          niche?: string | null
          setting?: string | null
          tone?: string | null
          updated_at?: string
          voice_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
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
      orders: {
        Row: {
          agent_id: string | null
          channel: string | null
          created_at: string
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_id: string | null
          id: string
          is_first_order: boolean
          items: Json
          notes: string | null
          payment_reference: string | null
          status: string | null
          total: number
          gross_margin: number | null
          base_profit: number | null
          surplus_profit: number | null
          surplus_type: string | null
          vendor_confirmation_status: string | null
          vendor_confirmed_at: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          channel?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_id?: string | null
          id?: string
          is_first_order?: boolean
          items?: Json
          notes?: string | null
          payment_reference?: string | null
          status?: string | null
          total?: number
          gross_margin?: number | null
          base_profit?: number | null
          surplus_profit?: number | null
          surplus_type?: string | null
          vendor_confirmation_status?: string | null
          vendor_confirmed_at?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          channel?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_id?: string | null
          id?: string
          is_first_order?: boolean
          items?: Json
          notes?: string | null
          payment_reference?: string | null
          status?: string | null
          total?: number
          gross_margin?: number | null
          base_profit?: number | null
          surplus_profit?: number | null
          surplus_type?: string | null
          vendor_confirmation_status?: string | null
          vendor_confirmed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_orders_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_agent"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ai_description: string | null
          category: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          images: string[] | null
          metadata: Json | null
          name: string
          price: number | null
          vendor_id: string | null
          vendor_cost: number | null
          inventory_mode: string | null
          stock_quantity: number | null
          sizes: string[] | null
          colors: string[] | null
          source_url: string | null
          status: string | null
          subcategory: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          ai_description?: string | null
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          metadata?: Json | null
          name: string
          price?: number | null
          vendor_id?: string | null
          vendor_cost?: number | null
          inventory_mode?: string | null
          stock_quantity?: number | null
          sizes?: string[] | null
          colors?: string[] | null
          source_url?: string | null
          status?: string | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          ai_description?: string | null
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          metadata?: Json | null
          name?: string
          price?: number | null
          vendor_id?: string | null
          vendor_cost?: number | null
          inventory_mode?: string | null
          stock_quantity?: number | null
          sizes?: string[] | null
          colors?: string[] | null
          source_url?: string | null
          status?: string | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_frames: {
        Row: {
          camera: string | null
          created_at: string
          dialogue: string | null
          expression: string | null
          frame_index: number
          id: string
          image_url: string | null
          metadata: Json | null
          project_id: string
          scene: string | null
        }
        Insert: {
          camera?: string | null
          created_at?: string
          dialogue?: string | null
          expression?: string | null
          frame_index?: number
          id?: string
          image_url?: string | null
          metadata?: Json | null
          project_id: string
          scene?: string | null
        }
        Update: {
          camera?: string | null
          created_at?: string
          dialogue?: string | null
          expression?: string | null
          frame_index?: number
          id?: string
          image_url?: string | null
          metadata?: Json | null
          project_id?: string
          scene?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_frames_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ugc_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_projects: {
        Row: {
          avatar_settings: Json | null
          avatar_url: string | null
          created_at: string
          id: string
          metadata: Json | null
          product_id: string | null
          provider: string | null
          script: string | null
          status: string | null
          storyboard: Json | null
          updated_at: string
          video_url: string | null
          voice_url: string | null
        }
        Insert: {
          avatar_settings?: Json | null
          avatar_url?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          provider?: string | null
          script?: string | null
          status?: string | null
          storyboard?: Json | null
          updated_at?: string
          video_url?: string | null
          voice_url?: string | null
        }
        Update: {
          avatar_settings?: Json | null
          avatar_url?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          provider?: string | null
          script?: string | null
          status?: string | null
          storyboard?: Json | null
          updated_at?: string
          video_url?: string | null
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_projects_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          value: string
          description: string | null
          updated_at: string
        }
        Insert: {
          key: string
          value: string
          description?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          value?: string
          description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          id: string
          user_id: string | null
          business_name: string
          category: string | null
          contact_person: string | null
          email: string | null
          phone: string | null
          address: string | null
          status: string | null
          score: number | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          business_name: string
          category?: string | null
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          status?: string | null
          score?: number | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          business_name?: string
          category?: string | null
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          status?: string | null
          score?: number | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      vendor_payouts: {
        Row: {
          id: string
          vendor_id: string
          amount: number
          status: string | null
          period_start: string | null
          period_end: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          amount: number
          status?: string | null
          period_start?: string | null
          period_end?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          amount?: number
          status?: string | null
          period_start?: string | null
          period_end?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payouts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
