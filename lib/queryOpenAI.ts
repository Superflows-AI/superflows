import { removeEmptyCharacters } from "./utils";
import {
  ChatGPTMessage,
  ChatGPTParams,
  ChatGPTResponse,
  OpenAIError,
} from "./models";

export const defaultParams: ChatGPTParams = {
  // This max tokens number is the maximum output tokens
  max_tokens: 1000,
  temperature: 0.6,
  top_p: 1,
  frequency_penalty: 0.5,
  presence_penalty: 0,
};

export async function getOpenAIResponse(
  messages: ChatGPTMessage[],
  params: ChatGPTParams = {},
  model: "3" | "4" | "3-16k"
): Promise<string> {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    // Use our default params, rather than OpenAI's when these aren't specified
    body: JSON.stringify({
      model:
        model === "3"
          ? "gpt-3.5-turbo-0613"
          : "3-16k"
          ? "gpt-3.5-turbo-16k-0613"
          : "gpt-4-0613",
      messages,
      ...defaultParams,
      ...params,
    }),
  };

  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    options
  );
  const responseJson: ChatGPTResponse | { error: OpenAIError } =
    await response.json();

  if (response.status === 429) {
    // Throwing an error triggers exponential backoff retry
    throw Error(
      // TODO: Check whether retry_after exists
      `OpenAI API rate limit exceeded. Full error: ${JSON.stringify(
        responseJson
      )}`
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

export async function streamOpenAIResponse(
  messages: ChatGPTMessage[],
  params: ChatGPTParams = {}
): Promise<ReadableStream | { message: string; status: number } | null> {
  /** Have only tested on edge runtime endpoints - not 100% sure it will work on Node runtime **/
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    // Use our default params, rather than OpenAI's when these aren't specified
    body: JSON.stringify({
      // model: "gpt-3.5-turbo-0613",
      model: "gpt-4-0613",
      messages,
      ...defaultParams,
      ...params,
      stream: true,
    }),
  };

  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    options
  );

  if (response.status === 429) {
    // Throwing an error triggers exponential backoff retry
    throw new Error(
      `OpenAI API rate limit exceeded. Full error: ${JSON.stringify(
        await response.json()
      )}`
    );
  }
  if (!response.ok) {
    const error = await response.json();
    console.error(`Error from ChatGPT: ${JSON.stringify(error.error)}`);
    return { message: error.error, status: response.status };
  }

  return response.body;
}
