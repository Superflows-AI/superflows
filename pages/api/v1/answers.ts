import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { z } from "zod";
import { USAGE_LIMIT } from "../../../lib/consts";
import {
  ActionToHttpRequest,
  ChatGPTMessage,
  ChatGPTParams,
  StreamingStepInput,
} from "../../../lib/models";
import {
  parseGPTStreamedData,
  parseOutput,
} from "../../../lib/parsers/parsers";
import getMessages from "../../../lib/prompts/chatBot";
import { streamOpenAIResponse } from "../../../lib/queryOpenAI";
import {
  convertToRenderable,
  exponentialRetryWrapper,
  isValidBody,
  openAiCost,
} from "../../../lib/utils";
import {
  getActiveActionTagsAndActions,
  getConversation,
} from "../../../lib/edge-runtime/utils";
import { Action, Organization, OrgJoinIsPaid } from "../../../lib/types";
import {
  httpRequestFromAction,
  processAPIoutput,
} from "../../../lib/edge-runtime/requests";

export const config = {
  runtime: "edge",
};

const OptionalStringZod = z.optional(z.string());

const AnswersZod = z.object({
  user_input: z.string(),
  conversation_id: z.nullable(z.number()),
  user_description: OptionalStringZod,
  user_api_key: OptionalStringZod,
  language: OptionalStringZod,
  stream: z.optional(z.boolean()),
});
type AnswersType = z.infer<typeof AnswersZod>;

const completionOptions: ChatGPTParams = {
  max_tokens: 1000,
};

// TODO: is this the best thing for open source? Would require users to have a redis account
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

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
    // Bring me my Bow of burning gold:
    const supabase = createClient(
      // Bring me my arrows of desire:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      // Bring me my Spear: O clouds unfold!
      process.env.SERVICE_LEVEL_KEY_SUPABASE ?? ""
      // Bring me my Chariot of fire!
    );

    // Authenticate that the user is allowed to use this API
    let token = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "")
      .replace("bearer ", "");
    let org: OrgJoinIsPaid | null = null;
    if (token) {
      const authRes = await supabase
        .from("organizations")
        .select("*, is_paid(*)")
        .eq("api_key", token)
        .single();
      if (authRes.error) throw new Error(authRes.error.message);
      org = authRes.data;
    }
    if (!org || !org.api_host) {
      return new Response(
        JSON.stringify({
          error: !org
            ? "Authentication failed"
            : "No API host found - add an API host on the API settings page",
        }),
        {
          status: !org ? 401 : 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check that the user hasn't surpassed the usage limit
    if (org.is_paid.length === 0 || !org.is_paid[0].is_premium) {
      // Below is the number of messages sent by the organization's users
      const usageRes = await supabase
        .from("chat_messages")
        .select("*", { count: "estimated", head: true })
        .eq("org_id", org.id)
        .eq("role", "user");
      if (usageRes.error) throw new Error(usageRes.error.message);
      const numQueriesMade = usageRes.count ?? 0;
      if (numQueriesMade >= USAGE_LIMIT) {
        return new Response(
          JSON.stringify({
            error: `You have reached your usage limit of ${USAGE_LIMIT} messages. Upgrade to premium to get unlimited messages.`,
          }),
          {
            status: 402,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Validate that the request body is of the correct format
    const requestData = await req.json();
    if (!isValidBody<AnswersType>(requestData, AnswersZod)) {
      return new Response(JSON.stringify({ message: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    // TODO: Add non-streaming API support (although the UX is 10x worse)
    if (requestData.stream === false) {
      return new Response(
        JSON.stringify({
          error: `Currently only the streaming API (stream=true) has been implemented. See API spec here: https://calm-silver-e6f.notion.site/Superflows-Public-API-8f6158cd6d4048d8b2ef0f29881be93d?pvs=4`,
        }),
        {
          status: 501,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get the past conversation from the DB
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
      if (convoInsertRes.error) {
        throw new Error(convoInsertRes.error.message);
      }
      conversationId = convoInsertRes.data.id;
    }
    const newUserMessage: ChatGPTMessage = {
      role: "user",
      content: requestData.user_input,
    };
    previousMessages.push(newUserMessage);
    console.log(
      "Number of previous messages in conversation: " + previousMessages.length
    );
    const insertedChatMessagesRes = await supabase
      .from("chat_messages")
      .insert({
        ...newUserMessage,
        conversation_id: conversationId,
        org_id: org.id,
        conversation_index: previousMessages.length - 1,
      });
    if (insertedChatMessagesRes.error) {
      throw new Error(insertedChatMessagesRes.error.message);
    }

    // Get the active actions from the DB which we can choose between
    const actionsWithTags = await getActiveActionTagsAndActions(org.id);
    const activeActions = actionsWithTags!
      .map((tag) => tag.actions)
      .flat()
      .filter((action) => action.active);
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
        const { nonSystemMessages: allMessages, cost } = await Angela(
          controller,
          requestData,
          activeActions,
          org!,
          conversationId,
          previousMessages
        );
        const insertedChatMessagesRes = await supabase
          .from("chat_messages")
          .insert(
            allMessages.slice(previousMessages.length).map((m, idx) => ({
              ...m,
              org_id: org!.id,
              conversation_id: conversationId,
              conversation_index: idx + 1,
            }))
          );
        if (insertedChatMessagesRes.error)
          throw new Error(insertedChatMessagesRes.error.message);

        const todaysDate = new Date().toISOString().split("T")[0];
        const { data, error } = await supabase
          .from("usage")
          .select("*")
          .eq("org_id", org!.id)
          .eq("date", todaysDate);
        if (error) throw new Error(error.message);
        if (data.length > 0) {
          const { error } = await supabase
            .from("usage")
            .update({ usage: cost + data[0].usage })
            .eq("id", data[0].id);
          if (error) throw new Error(error.message);
        } else {
          const { error: error2 } = await supabase
            .from("usage")
            .insert({ org_id: org!.id, usage: cost });
          if (error2) throw new Error(error2.message);
        }
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
    console.error(e);
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

async function Angela( // Good ol' Angela
  controller: ReadableStreamDefaultController,
  reqData: AnswersType,
  actions: Action[],
  org: Organization,
  conversationId: number,
  previousMessages: ChatGPTMessage[]
): Promise<{ nonSystemMessages: ChatGPTMessage[]; cost: number }> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let nonSystemMessages = [...previousMessages];

  function streamInfo(step: StreamingStepInput) {
    controller.enqueue(
      encoder.encode(
        "data:" +
          JSON.stringify({
            id: conversationId,
            ...step,
          })
      )
    );
  }

  let mostRecentParsedOutput = parseOutput("");
  let numOpenAIRequests = 0;
  let totalCost = 0;
  let awaitingConfirmation = false;

  try {
    while (!mostRecentParsedOutput.completed && !awaitingConfirmation) {
      const chatGptPrompt: ChatGPTMessage[] = getMessages(
        nonSystemMessages,
        actions,
        reqData.user_description,
        org,
        reqData.language ?? "English"
      );
      console.log(`\nChatGPT system prompt:\n ${chatGptPrompt[0].content}\n`);
      const promptInputCost = openAiCost(chatGptPrompt, "in");
      // console.log("GPT input cost:", promptInputCost);
      totalCost += promptInputCost;
      const res = await exponentialRetryWrapper(
        streamOpenAIResponse,
        [chatGptPrompt, completionOptions],
        3
      );
      if (res === null || "message" in res) {
        streamInfo({
          role: "error",
          content: "OpenAI API call failed",
        });
        return { nonSystemMessages, cost: totalCost };
      }

      // Stream response from OpenAI
      const reader = res.getReader();
      let rawOutput = "";
      let done = false;
      let incompleteChunk = "";
      // https://web.dev/streams/#asynchronous-iteration
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (done) break;

        const contentItems = parseGPTStreamedData(
          incompleteChunk + decoder.decode(value)
        );
        if (contentItems === undefined) {
          incompleteChunk += decoder.decode(value);
          continue;
        }

        incompleteChunk = "";
        for (const content of contentItems) {
          if (content === "[DONE]") {
            done = true;
            break;
          }
          rawOutput += content;
          const formatted = {
            role: "assistant",
            content,
          };
          streamInfo(formatted as StreamingStepInput);
        }
      }
      const newMessage = {
        role: "assistant",
        content: rawOutput,
      } as ChatGPTMessage;
      const outCost = openAiCost([newMessage], "out");
      console.log("GPT output cost: ", outCost);
      totalCost += outCost;

      mostRecentParsedOutput = parseOutput(rawOutput);
      // Add assistant message to nonSystemMessages
      nonSystemMessages.push(newMessage);

      const toConfirm: { actionId: number; parameters: object }[] = [];
      // Call endpoints here
      for (const command of mostRecentParsedOutput.commands) {
        const chosenAction = actions.find((a) => a.name === command.name);
        if (!chosenAction) {
          throw new Error(`Action ${command.name} not found!`);
        }

        const actionToHttpRequest: ActionToHttpRequest = {
          action: chosenAction,
          parameters: command.args,
          organization: org,
          stream: streamInfo,
          userApiKey: reqData.user_api_key ?? "",
        };

        if (
          ["get", "head", "options", "connect"].includes(
            chosenAction.request_method!.toLowerCase()
          )
        ) {
          let out = await httpRequestFromAction(actionToHttpRequest);
          out = processAPIoutput(out, chosenAction);
          console.log("Output from API call:", out);
          streamInfo({
            role: "function",
            name: command.name,
            content: JSON.stringify(out, null, 2),
          });
          const renderableOutput =
            "\n\n" + command.name + " output:\n" + convertToRenderable(out);
          nonSystemMessages.push({
            role: "function",
            name: command.name,
            content: renderableOutput,
          });
        } else {
          const confirmationMessage = {
            role: "assistant",
            content:
              "\n\nExecuting these instructions requires confirmation. I will not proceed until the user has provided this.",
          };

          toConfirm.push({
            actionId: chosenAction.id,
            parameters: command.args,
          });

          nonSystemMessages.push(confirmationMessage as ChatGPTMessage);
          streamInfo(confirmationMessage as StreamingStepInput);

          awaitingConfirmation = true;
        }
      }
      if (mostRecentParsedOutput.completed) {
        await storeActionsAwaitingConfirmation(toConfirm, conversationId);
        return { nonSystemMessages, cost: totalCost };
      }

      numOpenAIRequests++;
      if (numOpenAIRequests >= 5) {
        streamInfo({
          role: "error",
          content: "OpenAI API call limit reached",
        });
        return { nonSystemMessages, cost: totalCost };
      }
      await storeActionsAwaitingConfirmation(toConfirm, conversationId);
    }
  } catch (e) {
    console.error(e);
    streamInfo({
      role: "error",
      content: e?.toString() ?? "Internal server error",
    });
    return { nonSystemMessages, cost: totalCost };
  }
  return { nonSystemMessages, cost: totalCost };
}

async function storeActionsAwaitingConfirmation(
  toConfirm: { actionId: number; parameters: object }[],
  conversationId: number
) {
  if (toConfirm.length > 0) {
    if ((await redis.get(conversationId.toString())) !== null)
      throw new Error(
        `Conversation ID "${conversationId}" already exists in redis, something has gone wrong`
      );
    console.log("Setting redis key", conversationId.toString());

    await redis.json.set(conversationId.toString(), "$", { toConfirm });
    // 10 minutes seems like a reasonable time if the user gets distracted etc
    await redis.expire(conversationId.toString(), 60 * 10);
  }
}
