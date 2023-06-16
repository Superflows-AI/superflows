import { NextRequest } from "next/server";
import { ChatGPTMessage, ChatGPTParams } from "../../lib/models";
import { exponentialRetryWrapper } from "../../lib/utils";
import { streamOpenAIResponse } from "../../lib/queryOpenAI";
import getMessages from "../../lib/prompts/prompt";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing environment variable OPENAI_API_KEY");
}

// Use edge runtime for speed and streaming the response
export const config = {
  runtime: "edge",
};

export default async function handler(req: NextRequest): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(undefined, { status: 200 });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Only POST requests allowed",
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const requestData = await req.json();

  const completionOptions: ChatGPTParams = {
    max_tokens: 1000,
  };
  const chatGptPrompt: ChatGPTMessage[] = getMessages(
    requestData.userCopilotMessages ?? [],
    requestData.pageActions,
    requestData.currentPageName
  );
  console.log("chatGptPrompt", chatGptPrompt[0].content);
  // throw Error()

  const response = await exponentialRetryWrapper(
    streamOpenAIResponse,
    [chatGptPrompt, completionOptions],
    3
  );

  // Proxy the streamed SSE response from OpenAI
  return new Response(response, {
    headers: {
      "Content-Type": "text/event-stream",
    },
  });
}
