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

// TODO: Add zod

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
    requestData.currentPageName,
    {
      name: "Restoration Control CRM",
      description:
        "Restoration Control is a company that handles water damage, fire damage, mold remediation, and other restoration services. You are a chatbot for it's internal CRM, used by its salespeople and other employees.",
    },
    requestData.language
  );
  console.log("chatGptPrompt", chatGptPrompt[0].content);
  // throw Error()

  const response = await exponentialRetryWrapper(
    streamOpenAIResponse,
    [chatGptPrompt, completionOptions],
    3
  );
  if (!(response instanceof ReadableStream)) {
    return new Response(
      JSON.stringify({
        error: "Error streaming response from OpenAI",
        message: response?.message,
      }),
      {
        status: response?.status ?? 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Proxy the streamed SSE response from OpenAI
  return new Response(response, {
    headers: {
      "Content-Type": "text/event-stream",
    },
  });
}
