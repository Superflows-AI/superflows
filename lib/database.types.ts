export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "action_tags_api_id_fkey";
            columns: ["api_id"];
            isOneToOne: false;
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
            isOneToOne: false;
            referencedRelation: "action_tags";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "actions_api_id_fkey";
            columns: ["api_id"];
            isOneToOne: false;
            referencedRelation: "apis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "actions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      analytics_code_snippets: {
        Row: {
          chosen_actions: string[] | null;
          conversation_id: number;
          conversation_index: number;
          created_at: string;
          fresh: boolean;
          id: string;
          instruction_message: string;
          is_bertie: boolean;
          org_id: number;
          output: string;
        };
        Insert: {
          chosen_actions?: string[] | null;
          conversation_id?: number;
          conversation_index: number;
          created_at?: string;
          fresh?: boolean;
          id?: string;
          instruction_message?: string;
          is_bertie?: boolean;
          org_id: number;
          output: string;
        };
        Update: {
          chosen_actions?: string[] | null;
          conversation_id?: number;
          conversation_index?: number;
          created_at?: string;
          fresh?: boolean;
          id?: string;
          instruction_message?: string;
          is_bertie?: boolean;
          org_id?: number;
          output?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_code_snippets_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analytics_code_snippets_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
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
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      approval_answer_groups: {
        Row: {
          id: string;
          name: string;
          org_id: number;
        };
        Insert: {
          id?: string;
          name?: string;
          org_id: number;
        };
        Update: {
          id?: string;
          name?: string;
          org_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "public_verified_answer_groups_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      approval_answer_messages: {
        Row: {
          answer_id: string;
          created_at: string;
          generated_output: Json[];
          id: string;
          message_idx: number;
          message_type: Database["public"]["Enums"]["verified_message_types"];
          org_id: number;
          raw_text: string;
        };
        Insert: {
          answer_id: string;
          created_at?: string;
          generated_output?: Json[];
          id?: string;
          message_idx?: number;
          message_type: Database["public"]["Enums"]["verified_message_types"];
          org_id: number;
          raw_text?: string;
        };
        Update: {
          answer_id?: string;
          created_at?: string;
          generated_output?: Json[];
          id?: string;
          message_idx?: number;
          message_type?: Database["public"]["Enums"]["verified_message_types"];
          org_id?: number;
          raw_text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "public_verified_answer_messages_answer_id_fkey";
            columns: ["answer_id"];
            isOneToOne: false;
            referencedRelation: "approval_answers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "public_verified_answer_messages_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      approval_answers: {
        Row: {
          approved: boolean;
          created_at: string;
          description: string;
          fnName: string;
          generation_failed: boolean;
          group_id: string;
          id: string;
          is_generating: boolean;
          org_id: number;
        };
        Insert: {
          approved?: boolean;
          created_at?: string;
          description?: string;
          fnName?: string;
          generation_failed?: boolean;
          group_id: string;
          id?: string;
          is_generating?: boolean;
          org_id: number;
        };
        Update: {
          approved?: boolean;
          created_at?: string;
          description?: string;
          fnName?: string;
          generation_failed?: boolean;
          group_id?: string;
          id?: string;
          is_generating?: boolean;
          org_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "public_verified_answers_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verified_answers_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "approval_answer_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      approval_questions: {
        Row: {
          answer_id: string;
          created_at: string | null;
          embedded_text: string;
          embedding: number[];
          id: string;
          org_id: number;
          primary_question: boolean;
          text: string;
          user_added: boolean;
        };
        Insert: {
          answer_id: string;
          created_at?: string | null;
          embedded_text?: string;
          embedding?: number[];
          id?: string;
          org_id: number;
          primary_question?: boolean;
          text?: string;
          user_added?: boolean;
        };
        Update: {
          answer_id?: string;
          created_at?: string | null;
          embedded_text?: string;
          embedding?: number[];
          id?: string;
          org_id?: number;
          primary_question?: boolean;
          text?: string;
          user_added?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "public_verified_questions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verified_questions_answer_id_fkey";
            columns: ["answer_id"];
            isOneToOne: false;
            referencedRelation: "approval_answers";
            referencedColumns: ["id"];
          },
        ];
      };
      approval_variables: {
        Row: {
          consts: string[];
          default: Json;
          description: string;
          id: string;
          name: string;
          org_id: number;
          type: string;
          typeName: string;
        };
        Insert: {
          consts?: string[];
          default?: Json;
          description?: string;
          id?: string;
          name?: string;
          org_id: number;
          type?: string;
          typeName?: string;
        };
        Update: {
          consts?: string[];
          default?: Json;
          description?: string;
          id?: string;
          name?: string;
          org_id?: number;
          type?: string;
          typeName?: string;
        };
        Relationships: [
          {
            foreignKeyName: "public_verified_variables_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          chat_summary: string;
          chosen_actions: string[] | null;
          chosen_route: string | null;
          content: string;
          conversation_id: number;
          conversation_index: number;
          created_at: string;
          fresh: boolean;
          id: number;
          language: string | null;
          name: string | null;
          org_id: number;
          role: Database["public"]["Enums"]["chat_message_roles"];
          summary: string | null;
        };
        Insert: {
          chat_summary?: string;
          chosen_actions?: string[] | null;
          chosen_route?: string | null;
          content: string;
          conversation_id?: number;
          conversation_index: number;
          created_at?: string;
          fresh?: boolean;
          id?: number;
          language?: string | null;
          name?: string | null;
          org_id: number;
          role: Database["public"]["Enums"]["chat_message_roles"];
          summary?: string | null;
        };
        Update: {
          chat_summary?: string;
          chosen_actions?: string[] | null;
          chosen_route?: string | null;
          content?: string;
          conversation_id?: number;
          conversation_index?: number;
          created_at?: string;
          fresh?: boolean;
          id?: number;
          language?: string | null;
          name?: string | null;
          org_id?: number;
          role?: Database["public"]["Enums"]["chat_message_roles"];
          summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          id: number;
          is_playground: boolean;
          org_id: number;
          profile_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          is_playground?: boolean;
          org_id: number;
          profile_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          is_playground?: boolean;
          org_id?: number;
          profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "public_conversations_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
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
            isOneToOne: false;
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
          conversation_id?: number;
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
            isOneToOne: false;
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
            isOneToOne: false;
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
            isOneToOne: false;
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
          conversation_id?: number;
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
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_ups_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
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
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          api_key: string;
          bertie_disable_direct: boolean;
          bertie_enabled: boolean;
          chat_to_docs_enabled: boolean;
          chatbot_instructions: string;
          created_at: string | null;
          description: string;
          enable_data_analysis: boolean;
          fallback_to_bertie: boolean;
          fun_loading_messages: boolean;
          id: number;
          join_link_id: string | null;
          language: string;
          model: string;
          name: string;
          sanitize_urls_first: boolean;
          yond_cassius: boolean;
        };
        Insert: {
          api_key?: string;
          bertie_disable_direct?: boolean;
          bertie_enabled?: boolean;
          chat_to_docs_enabled?: boolean;
          chatbot_instructions?: string;
          created_at?: string | null;
          description?: string;
          enable_data_analysis?: boolean;
          fallback_to_bertie?: boolean;
          fun_loading_messages?: boolean;
          id?: number;
          join_link_id?: string | null;
          language?: string;
          model?: string;
          name?: string;
          sanitize_urls_first?: boolean;
          yond_cassius?: boolean;
        };
        Update: {
          api_key?: string;
          bertie_disable_direct?: boolean;
          bertie_enabled?: boolean;
          chat_to_docs_enabled?: boolean;
          chatbot_instructions?: string;
          created_at?: string | null;
          description?: string;
          enable_data_analysis?: boolean;
          fallback_to_bertie?: boolean;
          fun_loading_messages?: boolean;
          id?: number;
          join_link_id?: string | null;
          language?: string;
          model?: string;
          name?: string;
          sanitize_urls_first?: boolean;
          yond_cassius?: boolean;
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
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
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
            foreignKeyName: "public_usage_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
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
      search_approved_answers_with_group_ranking: {
        Args: {
          query_embedding: number[];
          similarity_threshold: number;
          match_count: number;
          _org_id: number;
        };
        Returns: {
          answer_id: string;
          text: string;
          mean_similarity: number;
        }[];
      };
    };
    Enums: {
      chat_message_roles: "user" | "assistant" | "function" | "error";
      verified_message_types:
        | "user"
        | "routing"
        | "filtering"
        | "code"
        | "text"
        | "function"
        | "suggestions"
        | "error";
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
          owner_id: string | null;
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
          owner_id?: string | null;
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
          owner_id?: string | null;
          public?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [];
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
          owner_id: string | null;
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
          owner_id?: string | null;
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
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
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
        Returns: string[];
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
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
      PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never;
