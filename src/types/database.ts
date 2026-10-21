export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        ComputedFields: never;
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      borrow_requests: {
        Row: {
          book_id: string;
          borrower_id: string;
          created_at: string;
          due_date: string | null;
          id: string;
          lender_id: string;
          status: Database["public"]["Enums"]["request_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          book_id: string;
          borrower_id: string;
          created_at?: string;
          due_date?: string | null;
          id?: string;
          lender_id: string;
          status?: Database["public"]["Enums"]["request_status"];
          updated_at?: string;
        };
        Update: {
          book_id?: string;
          borrower_id?: string;
          created_at?: string;
          due_date?: string | null;
          id?: string;
          lender_id?: string;
          status?: Database["public"]["Enums"]["request_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "borrow_requests_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "library_books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "borrow_requests_borrower_id_fkey";
            columns: ["borrower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "borrow_requests_lender_id_fkey";
            columns: ["lender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      friend_requests: {
        Row: {
          created_at: string;
          id: string;
          recipient_id: string;
          sender_id: string;
          status: Database["public"]["Enums"]["friend_request_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          recipient_id: string;
          sender_id: string;
          status?: Database["public"]["Enums"]["friend_request_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          recipient_id?: string;
          sender_id?: string;
          status?: Database["public"]["Enums"]["friend_request_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "friend_requests_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      friendships: {
        Row: {
          created_at: string;
          user_high: string;
          user_low: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          user_high: string;
          user_low: string;
        };
        Update: {
          created_at?: string;
          user_high?: string;
          user_low?: string;
        };
        Relationships: [
          {
            foreignKeyName: "friendships_user_high_fkey";
            columns: ["user_high"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "friendships_user_low_fkey";
            columns: ["user_low"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      library_books: {
        Row: {
          added_at: string;
          author: string;
          cover_url: string | null;
          id: string;
          isbn: string | null;
          owner_id: string;
          personal_rating: number | null;
          personal_review: string | null;
          search: unknown;
          source: Database["public"]["Enums"]["book_source"];
          status: Database["public"]["Enums"]["book_status"];
          title: string;
          updated_at: string;
          visibility: Database["public"]["Enums"]["book_visibility"];
        };
        ComputedFields: never;
        Insert: {
          added_at?: string;
          author: string;
          cover_url?: string | null;
          id?: string;
          isbn?: string | null;
          owner_id: string;
          personal_rating?: number | null;
          personal_review?: string | null;
          search?: never;
          source: Database["public"]["Enums"]["book_source"];
          status?: Database["public"]["Enums"]["book_status"];
          title: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["book_visibility"];
        };
        Update: {
          added_at?: string;
          author?: string;
          cover_url?: string | null;
          id?: string;
          isbn?: string | null;
          owner_id?: string;
          personal_rating?: number | null;
          personal_review?: string | null;
          search?: never;
          source?: Database["public"]["Enums"]["book_source"];
          status?: Database["public"]["Enums"]["book_status"];
          title?: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["book_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "library_books_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          city: string;
          created_at: string;
          display_name: string;
          id: string;
          neighborhood: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          city: string;
          created_at?: string;
          display_name: string;
          id: string;
          neighborhood?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          city?: string;
          created_at?: string;
          display_name?: string;
          id?: string;
          neighborhood?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          expo_push_token: string;
          platform: Database["public"]["Enums"]["push_platform"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          expo_push_token: string;
          platform: Database["public"]["Enums"]["push_platform"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          expo_push_token?: string;
          platform?: Database["public"]["Enums"]["push_platform"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          reason: Database["public"]["Enums"]["report_reason"];
          reported_user_id: string;
          reporter_id: string;
          request_id: string | null;
          status: Database["public"]["Enums"]["report_status"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason: Database["public"]["Enums"]["report_reason"];
          reported_user_id: string;
          reporter_id: string;
          request_id?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason?: Database["public"]["Enums"]["report_reason"];
          reported_user_id?: string;
          reporter_id?: string;
          request_id?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
        };
        Relationships: [
          {
            foreignKeyName: "reports_reported_user_id_fkey";
            columns: ["reported_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "borrow_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      request_messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          request_id: string;
          sender_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          request_id: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          request_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "request_messages_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "borrow_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "request_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      register_push_token: {
        Args: {
          p_expo_push_token: string;
          p_platform: Database["public"]["Enums"]["push_platform"];
        };
        Returns: undefined;
      };
      unregister_push_token: {
        Args: { p_expo_push_token: string };
        Returns: undefined;
      };
      cancel_friend_request: {
        Args: { p_request_id: string };
        Returns: Database["public"]["Enums"]["friend_request_status"];
      };
      cancel_request: {
        Args: { p_request_id: string };
        Returns: Database["public"]["Enums"]["request_status"];
      };
      list_blocked_users: {
        Args: Record<PropertyKey, never>;
        Returns: {
          display_name: string;
          id: string;
        }[];
      };
      mark_lent: {
        Args: { p_request_id: string };
        Returns: Database["public"]["Enums"]["request_status"];
      };
      mark_returned: {
        Args: { p_request_id: string };
        Returns: Database["public"]["Enums"]["request_status"];
      };
      remove_friend: { Args: { p_friend_id: string }; Returns: undefined };
      request_book: { Args: { p_book_id: string }; Returns: string };
      respond_to_friend_request: {
        Args: { p_request_id: string; p_response: string };
        Returns: Database["public"]["Enums"]["friend_request_status"];
      };
      respond_to_request: {
        Args: { p_due_date?: string; p_request_id: string; p_response: string };
        Returns: Database["public"]["Enums"]["request_status"];
      };
      send_friend_request: { Args: { p_recipient_id: string }; Returns: string };
      users_block_each_other: { Args: { p_other_user_id: string }; Returns: boolean };
    };
    Enums: {
      book_source: "manual" | "scan" | "goodreads_csv";
      book_status: "available" | "lent" | "hidden";
      book_visibility: "public" | "friends_only";
      friend_request_status: "pending" | "accepted" | "declined" | "cancelled";
      push_platform: "ios" | "android";
      report_reason: "not_returned" | "damaged" | "harassment" | "spam" | "other";
      report_status: "open" | "reviewed";
      request_status: "requested" | "accepted" | "declined" | "cancelled" | "lent" | "returned";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      book_source: ["manual", "scan", "goodreads_csv"],
      book_status: ["available", "lent", "hidden"],
      book_visibility: ["public", "friends_only"],
      friend_request_status: ["pending", "accepted", "declined", "cancelled"],
      push_platform: ["ios", "android"],
      report_reason: ["not_returned", "damaged", "harassment", "spam", "other"],
      report_status: ["open", "reviewed"],
      request_status: ["requested", "accepted", "declined", "cancelled", "lent", "returned"],
    },
  },
} as const;
