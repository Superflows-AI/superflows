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

// Required by the tokeniser
export interface ChatMessage {
  role?: "system" | "user" | "assistant";
  name?: string;
  content: string;
}

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

export type RequestMethods =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS";

export type StreamingStepInput =
  | { role: "assistant" | "error" | "debug"; content: string }
  | { role: "function"; name: string; content: string };
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
