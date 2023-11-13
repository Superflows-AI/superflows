import {
  ChatGPTMessage,
  ChatGPTParams,
  ChatGPTResponse,
  EmbeddingResponse,
  OpenAIError,
} from "./models";
import { removeEmptyCharacters } from "./utils";

export const defaultParams: ChatGPTParams = {
  // This max tokens number is the maximum output tokens
  max_tokens: 1000,
  temperature: 0.6,
  top_p: 1,
  frequency_penalty: 0.5,
  presence_penalty: 0,
};

type LLMChatMessage =
  | ChatGPTMessage
  | {
      role: "assistant";
      content: string;
      name: string;
    };

export async function getLLMResponse(
  prompt: string | ChatGPTMessage[],
  params: ChatGPTParams = {},
  model: string,
): Promise<string> {
  if (typeof prompt === "string" && model !== "gpt-3.5-turbo-instruct")
    throw new Error(
      `String prompts only supported with model gpt-3.5-turbo-instruct. You have selected model: ${model}`,
    );

  const { url, options } =
    typeof prompt === "string"
      ? getLLMRequestCompletion(prompt, params, model)
      : getLLMRequestChat(prompt, params, model);

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
  if ("message" in response.choices[0])
    return response.choices[0].message.content;
  return response.choices[0].text;
}

export async function streamLLMResponse(
  prompt: ChatGPTMessage[] | string,
  params: ChatGPTParams = {},
  model: string,
): Promise<ReadableStream | { message: string; status: number } | null> {
  /** Have only tested on edge runtime endpoints - not 100% sure it will work on Node runtime **/
  if (typeof prompt === "string" && model !== "gpt-3.5-turbo-instruct")
    throw new Error(
      `String prompts only supported with model gpt-3.5-turbo-instruct. You have selected model: ${model}`,
    );

  const { url, options } =
    typeof prompt === "string"
      ? getLLMRequestCompletion(prompt, { ...params, stream: true }, model)
      : getLLMRequestChat(prompt, { ...params, stream: true }, model);

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

function getLLMRequestCompletion(
  prompt: string,
  params: ChatGPTParams = {},
  model: string,
): {
  url: string;
  options: { method: string; headers: HeadersInit; body: string };
} {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    // Use our default params, rather than OpenAI's when these aren't specified
    body: JSON.stringify({
      model,
      prompt,
      ...defaultParams,
      ...params,
    }),
  };

  return { url: `https://api.openai.com/v1/completions`, options };
}

function getLLMRequestChat(
  messages: ChatGPTMessage[],
  params: ChatGPTParams = {},
  model: string,
): {
  url: string;
  options: { method: string; headers: HeadersInit; body: string };
} {
  const isOpenAIModel = model.includes("gpt");
  const isOSModel = !!(
    process.env.NEXT_PUBLIC_OS_MODEL &&
    model === JSON.parse(process.env.NEXT_PUBLIC_OS_MODEL).id
  );
  let key: string, url: string;
  if (isOpenAIModel) {
    key = process.env.OPENAI_API_KEY!;
    url = "https://api.openai.com/v1/chat/completions";
  } else if (isOSModel) {
    if (!process.env.OS_LLM_API_KEY || !process.env.OS_LLM_URL)
      throw new Error(
        "OS_LLM_API_KEY and OS_LLM_URL must be set in .env file to use open source LLMs",
      );
    key = process.env.OS_LLM_API_KEY!;
    url = process.env.OS_LLM_URL!;
  } else {
    key = process.env.OPENROUTER_API_KEY!;
    url = "https://openrouter.ai/api/v1/chat/completions";
  }

  let processedMessages: LLMChatMessage[] =
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
    body: JSON.stringify(
      !isOSModel
        ? // Not OS, so use OpenAI input
          {
            model,
            messages: processedMessages,
            ...defaultParams,
            ...params,
          }
        : // HF or equivalent endpoints
          {
            inputs: combineMessagesForHFEndpoints(processedMessages),
          },
    ),
  };
  if (!isOpenAIModel && !isOSModel) {
    // @ts-ignore
    options.headers["HTTP-Referer"] =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000/api"
        : "https://dashboard.superflows.ai/api";
    // @ts-ignore
    options.headers["X-Title"] =
      process.env.NODE_ENV === "development" ? "Superflows Dev" : "Superflows";
  }
  return { url, options };
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

export async function queryEmbedding(
  textToEmbed: string | string[],
): Promise<number[][]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-ada-002",
      input: textToEmbed,
    }),
  });

  const responseJson: EmbeddingResponse | { error: OpenAIError } =
    await response.json();

  if (response.status === 429) {
    // Throwing an error triggers exponential backoff retry
    throw new Error(
      `OpenAI API rate limit exceeded. Full error: ${JSON.stringify(
        responseJson,
      )}`,
    );
  }
  if ("error" in responseJson) {
    throw new Error(
      "Error from embedding: " +
        JSON.stringify(responseJson.error, undefined, 2),
    );
  }

  return responseJson.data.map((item) => item.embedding);
}

function combineMessagesForHFEndpoints(messages: LLMChatMessage[]): string {
  return messages
    .map((m) =>
      m.role !== "function"
        ? `<|${m.role}|>\n${m.content}</s>`
        : `function ${m.name} called\n${m.content}</s>`,
    )
    .join("\n");
}
