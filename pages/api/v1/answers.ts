import {
  getLastSectionName,
  parseGPTStreamedData,
  parseOutput,
} from "../../../lib/parsers/parsers";
import { NextRequest, NextResponse } from "next/server";
import {
  convertToRenderable,
  exponentialRetryWrapper,
  httpRequestFromAction,
  isValidBody,
} from "../../../lib/utils";
import { z } from "zod";
import { ChatGPTMessage, ChatGPTParams } from "../../../lib/models";
import { streamOpenAIResponse } from "../../../lib/queryOpenAI";
import getMessages from "../../../lib/prompts/prompt";
import {
  getActiveActionGroupsAndActions,
  getConversation,
  getOrgFromToken,
} from "../../../lib/edge-runtime/utils";
import { ActionGroupJoinActions } from "../../../lib/types";
import { createMiddlewareSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { Database, Json } from "../../../lib/database.types";

export const config = {
  runtime: "edge",
};

const OptionalStringZod = z.optional(z.string());

const AnswersZod = z.object({
  user_input: z.string(),
  conversation_id: z.nullable(z.number()),
  // TODO: Not used anywhere yet!!!
  user_description: OptionalStringZod,
  user_api_key: OptionalStringZod,
  language: OptionalStringZod,
  stream: z.optional(z.boolean()),
});
type AnswersType = z.infer<typeof AnswersZod>;

const completionOptions: ChatGPTParams = {
  max_tokens: 1000,
};

export default async function handler(req: NextRequest) {
  try {
    console.log("/api/v1/answers called!");
    // Handle CORS preflight request
    if (req.method === "OPTIONS") {
      return new Response(undefined, { status: 200 });
    }
    // Handle non-POST requests
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

    // Authenticate that the user is allowed to use this API
    let org = await getOrgFromToken(req);
    if (!org) {
      return new Response(
        JSON.stringify({
          error: "Authentication failed",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    const res = NextResponse.next();
    const supabase = createMiddlewareSupabaseClient<Database>({ req, res });

    // Validate that the request body is of the correct format
    const requestData = await req.json();
    console.log("Turned to json!" + JSON.stringify(requestData));
    if (!isValidBody<AnswersType>(requestData, AnswersZod)) {
      return new Response(JSON.stringify({ message: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get the past conversation from the DB
    console.log("Getting past convo");
    let previousMessages: ChatGPTMessage[] = [];
    let conversationId: number;
    if (requestData.conversation_id) {
      conversationId = requestData.conversation_id;
      const conversation = await getConversation(requestData.conversation_id);
      if (!conversation) {
        return new Response(
          JSON.stringify({
            error: `Conversation with ID=${requestData.conversation_id} not found`,
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      previousMessages = conversation;
    } else {
      const convoInsertRes = await supabase
        .from("conversations")
        .insert({ org_id: org.id })
        .select()
        .single();
      if (convoInsertRes.error) throw new Error(convoInsertRes.error.message);
      conversationId = convoInsertRes.data.id;
    }
    const newUserMessage: ChatGPTMessage = {
      role: "user",
      content: requestData.user_input,
    };
    previousMessages.push(newUserMessage);
    const insertedChatMessagesRes = await supabase
      .from("chat_messages")
      .insert({
        ...newUserMessage,
        conversation_id: conversationId,
        org_id: org.id,
        conversation_index: previousMessages.length - 1,
      });
    if (insertedChatMessagesRes.error)
      throw new Error(insertedChatMessagesRes.error.message);

    // Get the active actions from the DB which we can choose between
    const activeActions = await getActiveActionGroupsAndActions(org.id);
    if (!activeActions || activeActions.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No active actions found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const readableStream = new ReadableStream({
      async start(controller) {
        // Angela gets the answers for us
        await Angela(
          controller,
          requestData,
          activeActions,
          conversationId,
          previousMessages
        );
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: { "Content-Type": "text/event-stream; charset=utf-8" },
    });
  } catch (e) {
    let message: string;
    if (typeof e === "string") {
      message = e;
    } else if (e instanceof Error) {
      message = e.message;
    } else message = "Internal Server Error";
    console.error(message);
    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

type StreamingStepInput =
  | { role: "assistant"; content: string }
  | { role: "function"; name: string; content: Json };
export type StreamingStep = StreamingStepInput & { id: number };

async function Angela( // Good ol' Angela
  controller: ReadableStreamDefaultController,
  reqData: AnswersType,
  actionGroupJoinActions: ActionGroupJoinActions[],
  convoId: number,
  previousMessages: ChatGPTMessage[]
): Promise<void> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let nonSystemMessages = [...previousMessages];

  function streamInfo(step: StreamingStepInput | { error: string }) {
    controller.enqueue(
      encoder.encode(
        "data:" +
          JSON.stringify({
            id: convoId,
            ...step,
          })
      )
    );
  }

  let mostRecentParsedOutput = parseOutput("");
  let numOpenAIRequests = 0;
  // TODO: When changing away from page-based system, delete this
  let currentPageName = actionGroupJoinActions[0].name;

  while (!mostRecentParsedOutput.completed) {
    const chatGptPrompt: ChatGPTMessage[] = getMessages(
      nonSystemMessages,
      actionGroupJoinActions,
      currentPageName,
      {
        name: "Restoration Control CRM",
        description:
          "Restoration Control is a company that handles water damage, fire damage, mold remediation, and other restoration services. You are a chatbot for it's internal CRM, used by its salespeople and other employees.",
      },
      reqData.language ?? "English"
    );
    console.log("ChatGPTPrompt", chatGptPrompt[0].content);
    const res = await exponentialRetryWrapper(
      streamOpenAIResponse,
      [chatGptPrompt, completionOptions],
      3
    );
    if (res === null || "message" in res) {
      streamInfo({
        error: "OpenAI API call failed",
      });
      return;
    }

    // Stream response from OpenAI
    const reader = res.getReader();
    let rawOutput = "";
    // https://web.dev/streams/#asynchronous-iteration
    let done = false;
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (done) break;

      const contentItems = parseGPTStreamedData(decoder.decode(value));
      for (const content of contentItems) {
        if (content === "[DONE]") {
          done = true;
          break;
        }
        rawOutput += content;
        mostRecentParsedOutput = parseOutput(rawOutput);
        // const lastSectionName = getLastSectionName(rawOutput);
        console.log("Raw output", rawOutput);
        streamInfo({
          role: "assistant",
          content,
        });
      }
    }
    // Add assistant message to nonSystemMessages
    nonSystemMessages.push({ role: "assistant", content: rawOutput });

    // Call endpoints here
    for (const command of mostRecentParsedOutput.commands) {
      if (command.name === "navigateTo") {
        console.log("navigatingTo", command.args.pageName);
        currentPageName = command.args.pageName;
        streamInfo({
          role: "function",
          name: command.name,
          content: "Navigated to " + command.args.pageName,
        });
        nonSystemMessages.push({
          role: "function",
          name: command.name,
          content: "Navigated to " + command.args.pageName,
        });
        continue;
      }
      const chosenAction = actionGroupJoinActions
        .find((ag) => ag.name === currentPageName)!
        .actions.find((a) => a.name === command.name);
      if (!chosenAction) {
        throw new Error(`Action ${command.name} not found!`);
      }
      const out = await httpRequestFromAction(
        chosenAction,
        command.args,
        reqData.user_api_key ?? ""
      );
      const renderableOutput =
        "\n\n" + command.name + " output:\n" + convertToRenderable(out);
      streamInfo({
        role: "function",
        name: command.name,
        content: out,
      });
      nonSystemMessages.push({
        role: "function",
        name: command.name,
        content: renderableOutput,
      });
    }
    if (mostRecentParsedOutput.completed) {
      return;
    }

    numOpenAIRequests++;
    if (numOpenAIRequests >= 5) {
      streamInfo({ error: "OpenAI API call limit reached" });
      return;
    }
  }
}
