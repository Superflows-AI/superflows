import { Action } from "./types";

export type ChatGPTMessage =
  | {
      role: "system" | "user" | "assistant";
      content: string;
    }
  | {
      role: "function";
      content: string;
      name: string;
    };

export interface ChatGPTResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: [
    {
      message: ChatGPTMessage;
      finish_reason: string;
      index: number;
    }
  ];
}

export interface OpenAIError {
  message: string;
  type: string;
  param: string | null; // Might not be string
  code: number | null; // Might not be number
}

export interface ChatGPTParams {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[] | null;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Function | null;
  user?: string;
}

export type RequestMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS";

type NonSystemGPTMessage = Exclude<ChatGPTMessage, { role: "system" }>;

export type StreamingStepInput =
  | NonSystemGPTMessage
  | { role: "error" | "debug" | "confirmation"; content: string };

export type StreamingStep = StreamingStepInput & { id: number };
export interface ActionToHttpRequest {
  action: Action;
  parameters: Record<string, unknown>;
  organization: { api_host: string; id: number };
  userApiKey?: string;
  stream?: (input: StreamingStepInput) => void;
}
export interface FunctionCall {
  name: string;
  args: { [key: string]: any };
}

export interface ParsedOutput {
  reasoning: string;
  plan: string;
  tellUser: string;
  commands: FunctionCall[];
  // Only valid when streaming is complete. Don't use while streaming
  completed: boolean;
}

export interface OpenAPISchema {
  type?: "array" | "object"; // More are probably valid
  properties?: { [key: string]: any };
  required?: string[];
  items?: {
    properties?: { [key: string]: any };
    required?: string[];
  };
}

export interface Chunk {
  path: (string | number)[];
  data: any;
}

export interface Property {
  fieldName: string;
  type: string;
  description: string;
}

export interface Properties {
  [key: string | number]: {
    type?: string;
    description?: string;
    path: (string | number)[];
    data?: any;
  };
}
