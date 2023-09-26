import { removeEmptyCharacters } from "./utils";
import {
  ChatGPTMessage,
  ChatGPTParams,
  ChatGPTResponse,
  OpenAIError,
} from "./models";
import { IDStore, removeIDs } from "./edge-runtime/apiResponseSimplification";

export const defaultParams: ChatGPTParams = {
  // This max tokens number is the maximum output tokens
  max_tokens: 1000,
  temperature: 0.6,
  top_p: 1,
  frequency_penalty: 0.5,
  presence_penalty: 0,
};

export async function getLLMResponse(
  messages: ChatGPTMessage[],
  params: ChatGPTParams = {},
  model: string,
): Promise<string> {
  const { url, options } = getLLMRequest(messages, params, model);

  const response = await fetch(url, options);
  const responseJson: ChatGPTResponse | { error: OpenAIError } =
    await response.json();

  if (response.status === 429) {
    // Throwing an error triggers exponential backoff retry
    throw Error(
      // TODO: Check whether retry_after exists
      `OpenAI API rate limit exceeded. Full error: ${JSON.stringify(
        responseJson,
      )}`,
    );
  }
  if ("error" in responseJson) {
    console.log(`Error from ChatGPT: ${JSON.stringify(responseJson.error)}`);
    return "";
  }

  return removeEmptyCharacters(chatGPTtextFromResponse(responseJson)).trim();
}

export function chatGPTtextFromResponse(response: ChatGPTResponse): string {
  /* Assumes that you have set n = 1 in the params */
  return response.choices[0].message.content;
}

export async function streamLLMResponse(
  messages: ChatGPTMessage[],
  params: ChatGPTParams = {},
  model: string,
): Promise<ReadableStream | { message: string; status: number } | null> {
  /** Have only tested on edge runtime endpoints - not 100% sure it will work on Node runtime **/
  const { url, options } = getLLMRequest(
    messages,
    { ...params, stream: true },
    model,
  );
  const response = await fetch(url, options);

  if (response.status === 429) {
    // Throwing an error triggers exponential backoff retry
    throw new Error(
      `LLM rate limit exceeded. Full error: ${JSON.stringify(
        await response.json(),
      )}`,
    );
  }
  if (!response.ok) {
    const error = await response.json();
    console.error(`Error from ${model} LLM: ${JSON.stringify(error.error)}`);
    return { message: error.error, status: response.status };
  }

  return response.body;
}

export function removeIdsFromMessages(messages: ChatGPTMessage[]): {
  cleanedMessages: ChatGPTMessage[];
  idStore: IDStore;
} {
  let idStore: IDStore = {};
  const cleanedMessages = messages.map((message) => {
    if (message.role === "function") {
      try {
        let cleanedObject = JSON.parse(message.content);
        ({ cleanedObject, idStore } = removeIDs(cleanedObject, idStore));
        message.content = JSON.stringify(cleanedObject);
      } catch {}
    }
    return message;
  });

  return { cleanedMessages, idStore };
}

function getLLMRequest(
  messages: ChatGPTMessage[],
  params: ChatGPTParams = {},
  model: string,
): {
  url: string;
  options: { method: string; headers: HeadersInit; body: string };
} {
  const key = model.includes("gpt")
    ? process.env.OPENAI_API_KEY
    : process.env.OPENROUTER_API_KEY;
  const host = model.includes("gpt") ? "api.openai.com" : "openrouter.ai/api";

  let processedMessages =
    // Google palm 2 chat bison doesn't like function messages
    model !== "google/palm-2-chat-bison"
      ? messages
      : messages.map((m) =>
          m.role !== "function" ? { ...m } : { ...m, role: "assistant" },
        );

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    // Use our default params, rather than OpenAI's when these aren't specified
    body: JSON.stringify({
      model,
      messages: processedMessages,
      ...defaultParams,
      ...params,
    }),
  };
  if (!model.includes("gpt")) {
    // @ts-ignore
    options.headers["HTTP-Referer"] =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000/api"
        : "https://dashboard.superflows.ai/api";
    // @ts-ignore
    options.headers["X-Title"] =
      process.env.NODE_ENV === "development" ? "Superflows Dev" : "Superflows";
  }
  return { url: `https://${host}/v1/chat/completions`, options };
}

const baseSecondaryModelMapping = {
  "gpt-4-0613": "gpt-3.5-turbo-0613",
  "anthropic/claude-2": "anthropic/claude-instant-v1",
  "meta-llama/llama-2-70b-chat": "meta-llama/llama-2-70b-chat",
  "google/palm-2-chat-bison": "google/palm-2-chat-bison",
};

export function getSecondaryModel(mainModel: string): string {
  if (mainModel in baseSecondaryModelMapping) {
    // @ts-ignore
    return baseSecondaryModelMapping[mainModel];
  } else {
    // Default for fine-tuned models
    return "gpt-3.5-turbo-0613";
  }
}
