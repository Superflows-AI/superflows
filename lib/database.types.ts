export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
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
      action_tags: {
        Row: {
          api_id: string;
          created_at: string;
          description: string;
          id: number;
          name: string;
          org_id: number | null;
        };
        Insert: {
          api_id: string;
          created_at?: string;
          description?: string;
          id?: number;
          name?: string;
          org_id?: number | null;
        };
        Update: {
          api_id?: string;
          created_at?: string;
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
          },
          {
            foreignKeyName: "action_tags_api_id_fkey";
            columns: ["api_id"];
            referencedRelation: "apis";
            referencedColumns: ["id"];
          },
        ];
      };
      actions: {
        Row: {
          action_type: string;
          active: boolean;
          api_id: string;
          created_at: string;
          description: string;
          filtering_description: string;
          id: number;
          keys_to_keep: Json | null;
          link_name: string;
          link_url: string;
          name: string;
          org_id: number | null;
          parameters: Json | null;
          path: string | null;
          request_body_contents: Json | null;
          request_method: string | null;
          requires_confirmation: boolean;
          responses: Json | null;
          tag: number | null;
        };
        Insert: {
          action_type?: string;
          active?: boolean;
          api_id: string;
          created_at?: string;
          description?: string;
          filtering_description?: string;
          id?: number;
          keys_to_keep?: Json | null;
          link_name?: string;
          link_url?: string;
          name?: string;
          org_id?: number | null;
          parameters?: Json | null;
          path?: string | null;
          request_body_contents?: Json | null;
          request_method?: string | null;
          requires_confirmation?: boolean;
          responses?: Json | null;
          tag?: number | null;
        };
        Update: {
          action_type?: string;
          active?: boolean;
          api_id?: string;
          created_at?: string;
          description?: string;
          filtering_description?: string;
          id?: number;
          keys_to_keep?: Json | null;
          link_name?: string;
          link_url?: string;
          name?: string;
          org_id?: number | null;
          parameters?: Json | null;
          path?: string | null;
          request_body_contents?: Json | null;
          request_method?: string | null;
          requires_confirmation?: boolean;
          responses?: Json | null;
          tag?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "actions_action_group_fkey";
            columns: ["tag"];
            referencedRelation: "action_tags";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "actions_api_id_fkey";
            columns: ["api_id"];
            referencedRelation: "apis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "actions_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      analytics_code_snippets: {
        Row: {
          conversation_id: number;
          conversation_index: number;
          created_at: string;
          fresh: boolean;
          id: string;
          instruction_message: string;
          org_id: number;
          output: string;
        };
        Insert: {
          conversation_id: number;
          conversation_index: number;
          created_at?: string;
          fresh?: boolean;
          id?: string;
          instruction_message?: string;
          org_id: number;
          output: string;
        };
        Update: {
          conversation_id?: number;
          conversation_index?: number;
          created_at?: string;
          fresh?: boolean;
          id?: string;
          instruction_message?: string;
          org_id?: number;
          output?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_code_snippets_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analytics_code_snippets_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      apis: {
        Row: {
          api_host: string;
          auth_header: string;
          auth_query_param_name: string;
          auth_scheme: string | null;
          created_at: string;
          id: string;
          name: string;
          org_id: number;
        };
        Insert: {
          api_host?: string;
          auth_header?: string;
          auth_query_param_name?: string;
          auth_scheme?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          org_id: number;
        };
        Update: {
          api_host?: string;
          auth_header?: string;
          auth_query_param_name?: string;
          auth_scheme?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          org_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "apis_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          content: string;
          conversation_id: number;
          conversation_index: number;
          created_at: string;
          fresh: boolean;
          id: number;
          language: string | null;
          name: string | null;
          org_id: number;
          role: string;
          summary: string | null;
        };
        Insert: {
          content: string;
          conversation_id: number;
          conversation_index: number;
          created_at?: string;
          fresh?: boolean;
          id?: number;
          language?: string | null;
          name?: string | null;
          org_id: number;
          role: string;
          summary?: string | null;
        };
        Update: {
          content?: string;
          conversation_id?: number;
          conversation_index?: number;
          created_at?: string;
          fresh?: boolean;
          id?: number;
          language?: string | null;
          name?: string | null;
          org_id?: number;
          role?: string;
          summary?: string | null;
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
          },
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
          },
        ];
      };
      doc_chunks: {
        Row: {
          chunk_idx: number;
          created_at: string | null;
          embedding: number[];
          id: number;
          org_id: number;
          page_title: string | null;
          page_url: string | null;
          section_title: string | null;
          text_chunks: string[];
        };
        Insert: {
          chunk_idx: number;
          created_at?: string | null;
          embedding?: number[];
          id?: number;
          org_id: number;
          page_title?: string | null;
          page_url?: string | null;
          section_title?: string | null;
          text_chunks: string[];
        };
        Update: {
          chunk_idx?: number;
          created_at?: string | null;
          embedding?: number[];
          id?: number;
          org_id?: number;
          page_title?: string | null;
          page_url?: string | null;
          section_title?: string | null;
          text_chunks?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "doc_chunks_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback: {
        Row: {
          conversation_id: number;
          conversation_length_at_feedback: number;
          created_at: string | null;
          feedback_positive: boolean;
          id: number;
          negative_feedback_text: string | null;
          system_prompt: string | null;
        };
        Insert: {
          conversation_id: number;
          conversation_length_at_feedback: number;
          created_at?: string | null;
          feedback_positive: boolean;
          id?: number;
          negative_feedback_text?: string | null;
          system_prompt?: string | null;
        };
        Update: {
          conversation_id?: number;
          conversation_length_at_feedback?: number;
          created_at?: string | null;
          feedback_positive?: boolean;
          id?: number;
          negative_feedback_text?: string | null;
          system_prompt?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      finetuned_models: {
        Row: {
          created_at: string;
          id: string;
          openai_name: string;
          org_id: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          openai_name?: string;
          org_id: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          openai_name?: string;
          org_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "finetuned_models_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      fixed_headers: {
        Row: {
          api_id: string;
          created_at: string;
          id: string;
          name: string;
          value: string;
        };
        Insert: {
          api_id: string;
          created_at?: string;
          id?: string;
          name?: string;
          value?: string;
        };
        Update: {
          api_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fixed_headers_api_id_fkey";
            columns: ["api_id"];
            referencedRelation: "apis";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_ups: {
        Row: {
          conversation_id: number;
          conversation_index: number;
          created_at: string;
          follow_up_text: string;
          fresh: boolean;
          id: string;
          org_id: number;
        };
        Insert: {
          conversation_id: number;
          conversation_index: number;
          created_at?: string;
          follow_up_text: string;
          fresh?: boolean;
          id?: string;
          org_id: number;
        };
        Update: {
          conversation_id?: number;
          conversation_index?: number;
          created_at?: string;
          follow_up_text?: string;
          fresh?: boolean;
          id?: string;
          org_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "follow_ups_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_ups_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      is_paid: {
        Row: {
          id: number;
          is_premium: boolean;
          org_id: number;
        };
        Insert: {
          id?: number;
          is_premium?: boolean;
          org_id: number;
        };
        Update: {
          id?: number;
          is_premium?: boolean;
          org_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "is_paid_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          api_key: string;
          bertie_enabled: boolean;
          chat_to_docs_enabled: boolean;
          chatbot_instructions: string;
          created_at: string | null;
          description: string;
          id: number;
          join_link_id: string | null;
          language: string;
          model: string;
          name: string;
          sanitize_urls_first: boolean;
        };
        Insert: {
          api_key?: string;
          bertie_enabled?: boolean;
          chat_to_docs_enabled?: boolean;
          chatbot_instructions?: string;
          created_at?: string | null;
          description?: string;
          id?: number;
          join_link_id?: string | null;
          language?: string;
          model?: string;
          name?: string;
          sanitize_urls_first?: boolean;
        };
        Update: {
          api_key?: string;
          bertie_enabled?: boolean;
          chat_to_docs_enabled?: boolean;
          chatbot_instructions?: string;
          created_at?: string | null;
          description?: string;
          id?: number;
          join_link_id?: string | null;
          language?: string;
          model?: string;
          name?: string;
          sanitize_urls_first?: boolean;
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
          },
        ];
      };
      usage: {
        Row: {
          date: string;
          id: number;
          num_user_queries: number;
          org_id: number;
          usage: number;
        };
        Insert: {
          date?: string;
          id?: number;
          num_user_queries?: number;
          org_id: number;
          usage: number;
        };
        Update: {
          date?: string;
          id?: number;
          num_user_queries?: number;
          org_id?: number;
          usage?: number;
        };
        Relationships: [
          {
            foreignKeyName: "usage_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_all_page_section_counts: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      get_sections: {
        Args: {
          _limit: number;
          _offset: number;
        };
        Returns: {
          result_page_url: string;
          result_page_title: string;
          result_section_title: string;
          latest_created_at: string;
          ids: string;
        }[];
      };
      match_embeddings: {
        Args: {
          query_embedding: number[];
          similarity_threshold: number;
          match_count: number;
          _org_id: number;
        };
        Returns: {
          id: number;
          text_chunks: string[];
          similarity: number;
          page_url: string;
          chunk_idx: number;
          page_title: string;
          section_title: string;
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
          },
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
