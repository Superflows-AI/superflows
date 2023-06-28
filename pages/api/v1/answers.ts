import {
  getLastSectionName,
  parseGPTStreamedData,
  parseOutput,
} from "../../../lib/parsers/parsers";
import { NextRequest } from "next/server";
import {
  convertToRenderable,
  exponentialRetryWrapper,
  httpRequestFromAction,
  isValidBody,
  unpackAndCall,
} from "../../../lib/utils";
import { z } from "zod";
import { ChatGPTMessage, ChatGPTParams } from "../../../lib/models";
import { streamOpenAIResponse } from "../../../lib/queryOpenAI";
import getMessages from "../../../lib/prompts/prompt";
import {
  getActiveActionGroupsAndActions,
  getOrgFromToken,
} from "../../../lib/edge-runtime/utils";
import { ActionGroupJoinActions } from "../../../lib/types";

export const config = {
  runtime: "edge",
};

const MessageZod = z.object({
  role: z.union([
    z.literal("user"),
    z.literal("assistant"),
    z.literal("function"),
  ]),
  content: z.string(),
  name: z.optional(z.string()),
});

const AnswersZod = z.object({
  messages: z.array(MessageZod),
  // TODO: Not used anywhere yet!!!
  user_description: z.optional(z.string()),
  user_api_key: z.optional(z.string()),
  language: z.optional(z.string()),
});
type AnswersType = z.infer<typeof AnswersZod>;

const completionOptions: ChatGPTParams = {
  max_tokens: 1000,
};

export default async function handler(req: NextRequest) {
  console.log("api/v1/answers called!");
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

  const requestData = await req.json();
  if (!isValidBody<AnswersType>(requestData, AnswersZod)) {
    return new Response(JSON.stringify({ message: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const activeActions = await getActiveActionGroupsAndActions(org.id);
  if (!activeActions) {
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
      await Angela(controller, requestData, activeActions);
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8" },
  });
}

async function Angela( // Good ol' Angela
  controller: ReadableStreamDefaultController,
  reqData: AnswersType,
  actionGroupJoinActions: ActionGroupJoinActions[]
): Promise<void> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let mostRecentParsedOutput = parseOutput("");
  let nonSystemMessages = [...reqData.messages];
  // TODO: When changing away from page-based system, delete this
  let currentPageName = actionGroupJoinActions[0].name;
  let numOpenAIRequests = 0;

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
      controller.enqueue(
        encoder.encode(
          JSON.stringify({
            error: "OpenAI API call failed",
          })
        )
      );
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

      const content = parseGPTStreamedData(decoder.decode(value));
      if (content === "[DONE]") {
        done = true;
        break;
      }
      rawOutput += content;
      mostRecentParsedOutput = parseOutput(rawOutput);
      const lastSectionName = getLastSectionName(rawOutput);
      console.log("Raw output", rawOutput);
      // if (lastSectionName === "tell user") {
      // TODO: Decide on output format
      controller.enqueue(
        // encoder.encode(JSON.stringify({ [lastSectionName]: content }))
        encoder.encode(JSON.stringify({ text: content }))
      );
      // }
    }
    // Add assistant message to nonSystemMessages
    nonSystemMessages.push({ role: "assistant", content: rawOutput });

    // Call endpoints here
    for (const command of mostRecentParsedOutput.commands) {
      if (command.name === "navigateTo") {
        console.log("navigatingTo", command.args.pageName);
        currentPageName = command.args.pageName;
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              text: "\n\nNavigated to " + command.args.pageName,
            })
          )
        );
        nonSystemMessages.push({
          role: "function",
          name: command.name,
          content: "Navigated to " + command.args.pageName,
        });
      }
      const chosenAction = actionGroupJoinActions
        .find((ag) => ag.name === currentPageName)!
        .actions.find((a) => a.name === command.name);
      if (!chosenAction) {
        throw new Error(`Action ${command.name} not found!`);
      }
      const out = httpRequestFromAction(
        chosenAction,
        command.args,
        reqData.user_api_key ?? ""
      );
      const renderableOutput =
        command.name + " output:\n" + convertToRenderable(out);
      controller.enqueue(
        encoder.encode(JSON.stringify({ text: renderableOutput }))
      );
      nonSystemMessages.push({
        role: "function",
        name: command.name,
        content: renderableOutput,
      });
    }
    if (mostRecentParsedOutput.completed) {
      controller.enqueue(
        encoder.encode(
          JSON.stringify({
            text: "<button>Confirm</button>",
          })
        )
      );
    }

    numOpenAIRequests++;
    if (numOpenAIRequests >= 5) {
      controller.enqueue(
        encoder.encode(
          JSON.stringify({
            error: "OpenAI API call limit reached",
          })
        )
      );
      return;
    }
  }
}
