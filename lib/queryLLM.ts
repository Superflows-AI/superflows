import {
  AnthropicLegacyResponse,
  ChatGPTMessage,
  ChatGPTParams,
  ChatGPTResponse,
  Claude3Response,
  EmbeddingResponse,
  OpenAIError,
  RunPodResponse,
  TogetherAIResponse,
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
      ? getOAIRequestCompletion(prompt, params, model)
      : getLLMRequestChat(prompt, params, model);

  const response = await Promise.race([
    fetch(url, options),
    (async () => {
      // Time out after 30s
      await new Promise((resolve) => setTimeout(resolve, 30000));
      return new Response(
        JSON.stringify({ error: { message: "Timed out!" } }),
        {
          status: 500,
        },
      );
    })(),
  ]);
  const responseJson: ChatGPTResponse | { error: OpenAIError } =
    await response.json();
  if (response.status >= 300) {
    console.log(
      "Response from LLM: ",
      JSON.stringify(responseJson, undefined, 2),
    );
  }

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
    throw Error(
      `Error from LLM provider: ${JSON.stringify(responseJson.error)}`,
    );
  }

  return removeEmptyCharacters(textFromResponse(responseJson)).trim();
}

export function textFromResponse(
  response:
    | ChatGPTResponse
    | RunPodResponse
    | TogetherAIResponse
    | AnthropicLegacyResponse
    | Claude3Response,
): string {
  if ("completion" in response) return response.completion;
  if ("content" in response) {
    // Claude 3
    return response.content[0].text;
  }
  if ("output" in response) {
    if (typeof response.output === "string") return response.output;
    // @ts-ignore
    return response.output.choices[0].text;
  }
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
      ? getOAIRequestCompletion(prompt, { ...params, stream: true }, model)
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

// TODO: Rewrite this function to allow other LLMs, not just OpenAI so we can use Phind normally
function getOAIRequestCompletion(
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

function isOSModel(model: string): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_OS_MODEL &&
      model === JSON.parse(process.env.NEXT_PUBLIC_OS_MODEL).id,
  );
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
  const isMistralModel = model.includes("mistral");
  const isPhindModel = model.includes("Phind");
  const isAnthropicModel = model.includes("anthropic");
  const isOS = isOSModel(model);

  let key: string, url: string;
  if (isOpenAIModel) {
    key = process.env.OPENAI_API_KEY!;
    url = "https://api.openai.com/v1/chat/completions";
  } else if (isMistralModel) {
    key = process.env.MISTRAL_API_KEY!;
    url = "https://api.mistral.ai/v1/chat/completions";
    delete defaultParams.frequency_penalty;
    delete defaultParams.presence_penalty;
    // Mistral doesn't know about function messages & is fussy about only replying to user messages!
    // Below stringify-parse is deepcopy
    messages = JSON.parse(JSON.stringify(messages)).map((m: ChatGPTMessage) =>
      m.role !== "function"
        ? { ...m }
        : { role: "user", content: `${m.name} output: ${m.content}` },
    );
  } else if (isAnthropicModel && model.includes("claude-instant")) {
    const prompt = GPTChatFormatToClaudeInstant(messages);
    const max_tokens_to_sample = params.max_tokens;
    const stop_sequences = params.stop;
    const localParams = { ...params };
    delete localParams.max_tokens;
    delete localParams.stop;
    return {
      url: "https://api.anthropic.com/v1/complete",
      options: {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          ...localParams,
          max_tokens_to_sample,
          stop_sequences,
          model: model.split("/")[1],
          prompt: prompt,
        }),
      },
    };
  } else if (isAnthropicModel) {
    // Claude 3
    const stop_sequences = params.stop;
    const localParams = { ...params };
    delete localParams.stop;
    return {
      url: "https://api.anthropic.com/v1/messages",
      options: {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          ...localParams,
          stop_sequences,
          model: model.split("/")[1], // Remove 'anthropic/'
          system: messages[0].content,
          messages: messages.slice(1),
        }),
      },
    };
  } else if (isPhindModel) {
    const phindParams = {
      ...defaultParams,
      ...params,
    };
    if ("frequency_penalty" in phindParams) {
      // @ts-ignore
      phindParams.repetition_penalty = phindParams.frequency_penalty;
      delete phindParams.frequency_penalty;
    }
    if ("stream" in phindParams) {
      // @ts-ignore
      phindParams.stream_tokens = phindParams.stream;
      delete phindParams.stream;
    }
    if (!("top_k" in phindParams)) {
      // @ts-ignore
      phindParams.top_k = 50;
    }
    const promptText = GPTChatFormatToPhind(messages);
    // console.log("Prompt text: ", promptText);
    return {
      url: "https://api.together.xyz/inference",
      options: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.TOGETHER_AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...phindParams,
          model: model,
          prompt: promptText,
          request_type: "language-model-inference",
          stop: ["</s>", "```"],
        }),
      },
    };
  } else if (isOS) {
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

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    // Use our default params, rather than OpenAI's when these aren't specified
    body: JSON.stringify(
      !isOS
        ? // Not OS, so use OpenAI input
          {
            model,
            messages,
            ...defaultParams,
            ...params,
          }
        : // Self-hosted endpoints
          {
            input: {
              messages,
              ...defaultParams,
              ...params,
            },
          },
    ),
  };
  if (!isOpenAIModel && !isOS) {
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
};

export function getSecondaryModel(mainModel: string): string {
  if (mainModel in baseSecondaryModelMapping) {
    // @ts-ignore
    return baseSecondaryModelMapping[mainModel];
  } else if (isOSModel(mainModel)) {
    // Use OS model as secondary if primary model is OS
    return mainModel;
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

export function GPTChatFormatToPhind(chatMessages: ChatGPTMessage[]): string {
  const roleToName = {
    system: "System Prompt",
    user: "User Message",
    assistant: "Assistant",
    function: "Function: ",
  };
  return `${chatMessages
    .map(
      (message) => `
### ${roleToName[message.role]}${
        message.role === "function" ? " " + message.name : ""
      }
${message.content}`,
    )
    .join("\n")}${
    chatMessages[chatMessages.length - 1].role !== "assistant"
      ? "\n### Assistant\n"
      : ""
  }`;
}

export function GPTChatFormatToClaudeInstant(
  chatMessages: ChatGPTMessage[],
): string {
  const roleToName = {
    system: "",
    user: "Human:\n",
    assistant: "Assistant:\n",
    function: "Function: ", // Should never be used in Claude Instant
  };
  if (chatMessages.filter((m) => m.role === "function").length > 0) {
    throw new Error(
      "Function messages are not supported in Claude Instant. Please remove them.",
    );
  }
  const out = `${chatMessages
    .map((message) => `${roleToName[message.role]}${message.content}`)
    .join("\n\n")}`;
  if (!out.includes("\n\nHuman:")) {
    throw new Error(
      "Claude Instant requires a user message. Please add a user message to the prompt.",
    );
  }
  return out;
}
