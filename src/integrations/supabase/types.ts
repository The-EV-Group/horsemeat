export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      contractor: {
        Row: {
          available: boolean | null
          city: string | null
          email: string | null
          full_name: string | null
          hourly_rate: number | null
          id: string
          inserted_at: string | null
          notes: string | null
          pay_type: string | null
          phone: string | null
          preferred_contact: Database["public"]["Enums"]["contact_method"]
          prefers_hourly: boolean | null
          resume_url: string | null
          salary_higher: number | null
          salary_lower: number | null
          star_candidate: boolean | null
          state: string | null
          summary: string | null
          travel_anywhere: boolean
          travel_radius_miles: number | null
        }
        Insert: {
          available?: boolean | null
          city?: string | null
          email?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          inserted_at?: string | null
          notes?: string | null
          pay_type?: string | null
          phone?: string | null
          preferred_contact?: Database["public"]["Enums"]["contact_method"]
          prefers_hourly?: boolean | null
          resume_url?: string | null
          salary_higher?: number | null
          salary_lower?: number | null
          star_candidate?: boolean | null
          state?: string | null
          summary?: string | null
          travel_anywhere?: boolean
          travel_radius_miles?: number | null
        }
        Update: {
          available?: boolean | null
          city?: string | null
          email?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          inserted_at?: string | null
          notes?: string | null
          pay_type?: string | null
          phone?: string | null
          preferred_contact?: Database["public"]["Enums"]["contact_method"]
          prefers_hourly?: boolean | null
          resume_url?: string | null
          salary_higher?: number | null
          salary_lower?: number | null
          star_candidate?: boolean | null
          state?: string | null
          summary?: string | null
          travel_anywhere?: boolean
          travel_radius_miles?: number | null
        }
        Relationships: []
      }
      contractor_history: {
        Row: {
          contractor_id: string | null
          created_by: string | null
          id: string
          inserted_at: string | null
          note: string
        }
        Insert: {
          contractor_id?: string | null
          created_by?: string | null
          id?: string
          inserted_at?: string | null
          note: string
        }
        Update: {
          contractor_id?: string | null
          created_by?: string | null
          id?: string
          inserted_at?: string | null
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_history_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_history_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "internal_employee"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contractor_keyword: {
        Row: {
          contractor_id: string
          keyword_id: string
          note: string | null
          position: number | null
        }
        Insert: {
          contractor_id: string
          keyword_id: string
          note?: string | null
          position?: number | null
        }
        Update: {
          contractor_id?: string
          keyword_id?: string
          note?: string | null
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_keyword_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_keyword_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "keyword"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_task: {
        Row: {
          contractor_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_public: boolean | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string | null
        }
        Insert: {
          contractor_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_public?: boolean | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string | null
        }
        Update: {
          contractor_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_public?: boolean | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_task_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_created_by_employee"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "internal_employee"
            referencedColumns: ["user_id"]
          },
        ]
      }
      internal_employee: {
        Row: {
          email: string | null
          full_name: string | null
          id: string
          inserted_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          email?: string | null
          full_name?: string | null
          id?: string
          inserted_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          email?: string | null
          full_name?: string | null
          id?: string
          inserted_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      keyword: {
        Row: {
          category: string
          id: string
          inserted_at: string | null
          name: string
        }
        Insert: {
          category: string
          id?: string
          inserted_at?: string | null
          name: string
        }
        Update: {
          category?: string
          id?: string
          inserted_at?: string | null
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
    }
    Enums: {
      contact_method: "email" | "phone" | "text"
      task_status: "overdue" | "in progress" | "completed"
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
      contact_method: ["email", "phone", "text"],
      task_status: ["overdue", "in progress", "completed"],
    },
  },
} as const
