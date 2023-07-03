export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
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
      action_groups: {
        Row: {
          created_at: string | null;
          description: string;
          id: number;
          name: string;
          org_id: number | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string;
          id?: number;
          name?: string;
          org_id?: number | null;
        };
        Update: {
          created_at?: string | null;
          description?: string;
          id?: number;
          name?: string;
          org_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "action_groups_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      actions: {
        Row: {
          action_group: number | null;
          action_type: string;
          active: boolean;
          created_at: string;
          description: string;
          id: number;
          name: string;
          org_id: number | null;
          parameters: Json | null;
          path: string | null;
          request_body_contents: Json | null;
          request_method: string | null;
          responses: Json | null;
        };
        Insert: {
          action_group?: number | null;
          action_type?: string;
          active?: boolean;
          created_at?: string;
          description?: string;
          id?: number;
          name?: string;
          org_id?: number | null;
          parameters?: Json | null;
          path?: string | null;
          request_body_contents?: Json | null;
          request_method?: string | null;
          responses?: Json | null;
        };
        Update: {
          action_group?: number | null;
          action_type?: string;
          active?: boolean;
          created_at?: string;
          description?: string;
          id?: number;
          name?: string;
          org_id?: number | null;
          parameters?: Json | null;
          path?: string | null;
          request_body_contents?: Json | null;
          request_method?: string | null;
          responses?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "actions_action_group_fkey";
            columns: ["action_group"];
            referencedRelation: "action_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "actions_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_messages: {
        Row: {
          content: string;
          conversation_id: number;
          conversation_index: number;
          created_at: string;
          id: number;
          name: string | null;
          org_id: number;
          role: string;
        };
        Insert: {
          content: string;
          conversation_id: number;
          conversation_index: number;
          created_at?: string;
          id?: number;
          name?: string | null;
          org_id: number;
          role: string;
        };
        Update: {
          content?: string;
          conversation_id?: number;
          conversation_index?: number;
          created_at?: string;
          id?: number;
          name?: string | null;
          org_id?: number;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          id: number;
          org_id: number;
        };
        Insert: {
          created_at?: string;
          id?: number;
          org_id: number;
        };
        Update: {
          created_at?: string;
          id?: number;
          org_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      organizations: {
        Row: {
          api_host: string;
          api_key: string;
          created_at: string | null;
          description: string;
          id: number;
          name: string;
        };
        Insert: {
          api_host?: string;
          api_key?: string;
          created_at?: string | null;
          description?: string;
          id?: number;
          name?: string;
        };
        Update: {
          api_host?: string;
          api_key?: string;
          created_at?: string | null;
          description?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          email_address: string | null;
          full_name: string;
          id: string;
          org_id: number | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          email_address?: string | null;
          full_name?: string;
          id: string;
          org_id?: number | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          email_address?: string | null;
          full_name?: string;
          id?: string;
          org_id?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      usage: {
        Row: {
          date: string | null;
          organization_id: number;
          usage: number | null;
        };
        Insert: {
          date?: string | null;
          organization_id?: number;
          usage?: number | null;
        };
        Update: {
          date?: string | null;
          organization_id?: number;
          usage?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "usage_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          public: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          public?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          public?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "buckets_owner_fkey";
            columns: ["owner"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          version: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          version?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey";
            columns: ["bucket_id"];
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "objects_owner_fkey";
            columns: ["owner"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_insert_object: {
        Args: {
          bucketid: string;
          name: string;
          owner: string;
          metadata: Json;
        };
        Returns: undefined;
      };
      extension: {
        Args: {
          name: string;
        };
        Returns: string;
      };
      filename: {
        Args: {
          name: string;
        };
        Returns: string;
      };
      foldername: {
        Args: {
          name: string;
        };
        Returns: unknown;
      };
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>;
        Returns: {
          size: number;
          bucket_id: string;
        }[];
      };
      search: {
        Args: {
          prefix: string;
          bucketname: string;
          limits?: number;
          levels?: number;
          offsets?: number;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          name: string;
          id: string;
          updated_at: string;
          created_at: string;
          last_accessed_at: string;
          metadata: Json;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
