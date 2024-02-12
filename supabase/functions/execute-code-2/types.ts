export interface Action {
  action_type: string;
  active: boolean;
  api_id: string;
  created_at: string;
  description: string;
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
}

export interface Header {
  api_id: string;
  created_at: string;
  id: string;
  name: string;
  value: string;
}

interface Api {
  api_host: string;
  auth_header: string;
  auth_query_param_name: string;
  auth_scheme: string | null;
  created_at: string;
  id: string;
  name: string;
  org_id: number;
}

export type ActionPlusApiInfo = Action & {
  api: Api;
  headers: Header[];
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ChatGPTMessage =
  | {
      role: "system" | "user" | "assistant";
      content: string;
    }
  | FunctionMessage;

export interface FunctionMessage {
  role: "function";
  content: string;
  name: string;
}
