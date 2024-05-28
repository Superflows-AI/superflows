import { z } from "zod";
import { ActionPlusApiInfo } from "./types";
import { FunctionCall } from "@superflows/chat-ui-react";
import { StreamingStepInput } from "@superflows/chat-ui-react/dist/src/lib/types";

export type NonSystemMessage =
  | {
      role: "user" | "assistant";
      content: string;
    }
  | FunctionMessage;

export type ChatGPTMessage =
  | {
      role: "system";
      content: string;
    }
  | NonSystemMessage;

export type Claude3Message = Exclude<ChatGPTMessage, { role: "function" }>;

export interface FunctionMessage {
  role: "function";
  content: string;
  name: string;
}

export type GPTMessageInclSummary =
  | {
      role: "system" | "assistant";
      content: string;
    }
  | {
      role: "user";
      content: string;
      chat_summary?: string;
      chosen_actions?: string[];
      chosen_route?: string;
    }
  | FunctionMessageInclSummary;

export interface FunctionMessageInclSummary extends FunctionMessage {
  summary?: string;
  urls?: { name: string; url: string }[];
}

interface MessageChoice {
  message: ChatGPTMessage;
  finish_reason: string;
  index: number;
}

interface TextChoice {
  text: string;
  finish_reason: string;
  index: number;
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

  choices: MessageChoice[] | TextChoice[];
}

export interface RunPodResponse {
  delayTime: number;
  executionTime: number;
  id: string;
  output: string;
  status: string;
}

export interface TogetherAIResponse {
  id: string;
  status: string;
  prompt: string[];
  model: string;
  model_owner: string;
  num_returns: number;
  args: {
    max_tokens: number;
    temperature: number;
    top_p: number;
    repetition_penalty: number;
    model: string;
    prompt: string[];
    request_type: string;
    stop: string[];
  };
  subjobs: string[];
  output: {
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    result_type: string;
    choices: {}[];
  };
}

export interface AnthropicLegacyResponse {
  type: string;
  id: string;
  completion: string;
  stop_reason: "stop_sequence" | "max_tokens";
  model: string;
}

export interface Claude3Response {
  content: {
    text: string;
    type: string;
  }[];
  id: string;
  model: string;
  role: "assistant";
  stop_reason: "end_turn" | "stop_sequence";
  stop_sequence: string | null;
  type: "message";
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
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

export interface ActionToHttpRequest {
  action: ActionPlusApiInfo;
  parameters: Record<string, unknown>;
  organization: {
    id: number;
  };
  userApiKey?: string;
  stream?: (input: StreamingStepInput) => void;
}

export interface Chunk {
  path: (string | number)[];
  data: any;
}

export interface Properties {
  [key: string | number]: {
    type?: string;
    description?: string;
    path: (string | number)[];
    data?: any;
  };
}

export interface EmbeddingResponse {
  data: { embedding: number[]; index: number; object: string }[];
  model: string;
  object: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

const OptionalStringZod = z.optional(z.string());

export const AnswersZod = z.object({
  user_input: z.string(),
  conversation_id: z.nullable(z.number()),
  user_description: OptionalStringZod,
  user_api_key: OptionalStringZod,
  stream: z.optional(z.boolean()),
  mock_api_responses: z.optional(z.boolean()),
  api_params: z.optional(
    z.array(
      z.object({
        name: z.string(),
        hostname: z.optional(z.string()),
        headers: z.optional(z.record(z.string())),
      }),
    ),
  ),
  debug: z.optional(z.boolean()),
});

export type AnswersType = z.infer<typeof AnswersZod>;

export interface ToConfirm extends FunctionCall {
  actionId: number;
}
