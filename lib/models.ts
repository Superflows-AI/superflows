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
