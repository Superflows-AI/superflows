import { createMiddlewareSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { FunctionCall, parseOutput } from "@superflows/chat-ui-react";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MAX_TOKENS_OUT, USAGE_LIMIT } from "../../../lib/consts";
import { Database } from "../../../lib/database.types";
import { filterActions } from "../../../lib/edge-runtime/filterActions";
import { getMissingArgCorrections } from "../../../lib/edge-runtime/missingParamCorrection";
import {
  constructHttpRequest,
  makeHttpRequest,
  processAPIoutput,
} from "../../../lib/edge-runtime/requests";
import summarizeText from "../../../lib/edge-runtime/summarize";
import {
  DBChatMessageToGPT,
  MessageInclSummaryToGPT,
  getFreeTierUsage,
  getHost,
  removeOldestFunctionCalls,
} from "../../../lib/edge-runtime/utils";
import { getLanguage } from "../../../lib/language";
import {
  ActionToHttpRequest,
  ChatGPTMessage,
  ChatGPTParams,
  GPTMessageInclSummary,
  StreamingStepInput,
} from "../../../lib/models";
import { parseGPTStreamedData } from "../../../lib/parsers/parsers";
import getMessages from "../../../lib/prompts/chatBot";
import {
  getSecondaryModel,
  streamLLMResponse,
} from "../../../lib/queryLLM";
import {
  ActionPlusApiInfo,
  OrgJoinIsPaidFinetunedModels,
} from "../../../lib/types";
import {
  exponentialRetryWrapper,
  getTokenCount,
  isValidBody,
  openAiCost,
} from "../../../lib/utils";

export const config = {
  runtime: "edge",
  // Edge gets upset with our use of recharts in chat-ui-react.
  // TODO: Make it possible to import chat-ui-react without recharts
  unstable_allowDynamic: ["**/node_modules/@superflows/chat-ui-react/**"],
};

const OptionalStringZod = z.optional(z.string());

const AnswersZod = z.object({
  user_input: z.string(),
  conversation_id: z.nullable(z.number()),
  user_description: OptionalStringZod,
  user_api_key: OptionalStringZod,
  stream: z.optional(z.boolean()),
  mock_api_responses: z.optional(z.boolean()),
  test_mode: z.optional(z.boolean()),
});
type AnswersType = z.infer<typeof AnswersZod>;

const completionOptions: ChatGPTParams = {
  max_tokens: MAX_TOKENS_OUT,
};

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined!");
}
if (!process.env.SERVICE_LEVEL_KEY_SUPABASE) {
  throw new Error("SERVICE_LEVEL_KEY_SUPABASE is not defined!");
}

let redis: Redis | null = null,
  ratelimit: Ratelimit | null = null;
if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  redis = Redis.fromEnv();

  // Create a new ratelimiter, that allows 3 requests per 10 seconds
  ratelimit = new Ratelimit({
    redis: redis,
    // TODO: When someone is in production, this should be raised
    limiter: Ratelimit.slidingWindow(3, "10 s"),
  });
}

// Bring me my Bow of burning gold:
const supabase = createClient<Database>(
  // Bring me my arrows of desire:
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  // Bring me my Spear: O clouds unfold!
  process.env.SERVICE_LEVEL_KEY_SUPABASE,
  // Bring me my Chariot of fire!
);

const headers = { "Content-Type": "application/json" };

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
        { status: 405, headers },
      );
    }

    // Authenticate that the user is allowed to use this API
    const orgApiKey = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "")
      .replace("bearer ", "");

    if (!orgApiKey) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers,
      });
    }

    // Check that the user hasn't surpassed the rate limit
    if (ratelimit) {
      const { success } = await ratelimit.limit(orgApiKey);
      if (!success) {
        return new Response(JSON.stringify({ error: "Rate limit hit" }), {
          status: 429,
          headers,
        });
      }
    }

    let org: OrgJoinIsPaidFinetunedModels | null = null;
    if (orgApiKey) {
      const authRes = await supabase
        .from("organizations")
        .select("*, is_paid(*), finetuned_models(*)")
        .eq("api_key", orgApiKey);
      if (authRes.error) throw new Error(authRes.error.message);
      org = authRes.data?.[0] ?? null;
    }
    if (!org) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers,
      });
    }

    // Check the cookie to see if the user is logged in via supabase (in playground) or not
    // This determines whether to increment usage or not
    let isPlayground: boolean;
    const cookie = req.headers.get("cookie");
    if (cookie) {
      const res = NextResponse.next();
      const authSupa = createMiddlewareSupabaseClient({ req, res });
      const {
        data: { session },
      } = await authSupa.auth.getSession();
      isPlayground = !!(session && session.user);
    } else {
      isPlayground = false;
    }

    // Check that the user hasn't surpassed the usage limit
    if (
      process.env.NODE_ENV === "production" &&
      (org.is_paid.length === 0 || !org.is_paid[0].is_premium)
    ) {
      const { overLimit } = await getFreeTierUsage(supabase, org.id);
      if (overLimit) {
        return new Response(
          JSON.stringify({
            error: `You have reached your usage limit of ${USAGE_LIMIT} messages. Upgrade to premium to get unlimited messages.`,
          }),
          { status: 402, headers },
        );
      }
    }

    // Validate that the request body is of the correct format
    const requestData = await req.json();
    if (!isValidBody<AnswersType>(requestData, AnswersZod)) {
      return new Response(JSON.stringify({ message: "Invalid request body" }), {
        status: 400,
        headers,
      });
    }

    // If there's no past conversation and no user input, return an error
    if (!requestData.conversation_id && !requestData.user_input) {
      return new Response(
        JSON.stringify({
          error: `You must provide either a user input or a conversation ID for an existing conversation`,
        }),
        { status: 400, headers },
      );
    }

    console.log(
      `Answers endpoint called with valid request body for conversation id: ${requestData.conversation_id}`,
    );

    // TODO: Add non-streaming API support (although the UX is 10x worse)
    if (requestData.stream === false) {
      return new Response(
        JSON.stringify({
          error: `Currently only the streaming API (stream=true) has been implemented. See API spec here: https://calm-silver-e6f.notion.site/Superflows-Public-API-8f6158cd6d4048d8b2ef0f29881be93d?pvs=4`,
        }),
        { status: 501, headers },
      );
    }

    // Get the past conversation from the DB
    let language: string | null = null;
    let previousMessages: GPTMessageInclSummary[] = [];
    let conversationId: number;
    if (requestData.conversation_id) {
      console.log(
        `Conversation ID provided: ${requestData.conversation_id}. Fetching previous messages`,
      );
      conversationId = requestData.conversation_id;
      const convResp = await supabase
        .from("chat_messages")
        .select()
        .eq("conversation_id", requestData.conversation_id)
        .eq("org_id", org.id)
        .order("conversation_index", { ascending: true });

      if (convResp.error) throw new Error(convResp.error.message);
      const conversation = convResp.data.map(DBChatMessageToGPT);

      if (!conversation) {
        return new Response(
          JSON.stringify({
            error: `Conversation with ID=${requestData.conversation_id} not found`,
          }),
          { status: 404, headers },
        );
      }
      previousMessages = conversation;

      // If the language is set for any message in the conversation, use that
      language = convResp.data.find((m) => !!m.language)?.language ?? null;
    } else {
      console.log(`No conversation ID provided. Creating new conversation`);
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
    // If the language is not set, try to detect it using detectlanguage.com
    if (!language && process.env.NEXT_PUBLIC_DETECT_LANGUAGE_KEY) {
      language = await getLanguage(requestData.user_input);
    }
    const newUserMessage: ChatGPTMessage = {
      role: "user",
      content: requestData.user_input,
    };
    previousMessages.push(newUserMessage);
    console.log(
      "Number of previous messages in conversation: " + previousMessages.length,
    );
    const insertedChatMessagesRes = await supabase
      .from("chat_messages")
      .insert({
        ...newUserMessage,
        conversation_id: conversationId,
        org_id: org.id,
        conversation_index: previousMessages.length - 1,
        language,
      });
    if (insertedChatMessagesRes.error) {
      throw new Error(insertedChatMessagesRes.error.message);
    }

    // Get the active actions from the DB which we can choose between
    // Below gets the action tags and actions that are active
    const actionTagResp = await supabase
      .from("action_tags")
      .select("*,actions!inner(*),apis(*, fixed_headers(*))")
      .eq("org_id", org.id)
      .eq("actions.active", true);
    if (actionTagResp.error) throw new Error(actionTagResp.error.message);
    const actionsWithTags = actionTagResp.data;
    const activeActions = actionsWithTags!
      .map((tag) => {
        const currentHost = getHost(req);

        const mockUrl = currentHost + "/api/mock";
        // Store the api_host with each action
        return tag.actions.map((a) => ({
          ...a,
          // Override api_host if mock_api_responses is set to true
          api_host: requestData.mock_api_responses
            ? mockUrl
            : tag.apis?.api_host ?? "",
          auth_header: tag.apis?.auth_header ?? "",
          auth_scheme: tag.apis?.auth_scheme ?? null,
          headers: tag.apis?.fixed_headers ?? [],
        }));
      })
      .flat()
      .filter((action) => action.active);
    if (!activeActions || activeActions.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "You have no active actions set for your organization. Add them if you have access to the Superflows dashboard or reach out to your IT team.",
        }),
        { status: 404, headers },
      );
    }
    activeActions.forEach((action) => {
      // Check that every action has an api_host
      if (!action.api_host) {
        return new Response(
          JSON.stringify({
            error: `No API host found for action with name: ${action.name} - add an API host on the API settings page`,
          }),
          { status: 400, headers },
        );
      }
    });

    console.log(
      `${activeActions.length} active actions found: ${JSON.stringify(
        activeActions.map((a) => a.name),
      )}`,
    );
    const currentHost = getHost(req);

    const readableStream = new ReadableStream({
      async start(controller) {
        // Angela gets the answers for us
        const {
          nonSystemMessages: allMessages,
          cost,
          numUserQueries,
        } = await Angela(
          controller,
          requestData,
          activeActions,
          org!,
          conversationId,
          previousMessages,
          language,
          currentHost,
        );
        const insertedChatMessagesRes = await supabase
          .from("chat_messages")
          .insert(
            allMessages.slice(previousMessages.length).map((m, idx) => ({
              ...m,
              org_id: org!.id,
              conversation_id: conversationId,
              conversation_index: previousMessages.length + idx,
              language,
            })),
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
            .update({
              usage: cost + data[0].usage,
              num_user_queries: isPlayground
                ? data[0].num_user_queries
                : data[0].num_user_queries + numUserQueries,
            })
            .eq("id", data[0].id);
          if (error) throw new Error(error.message);
        } else {
          const { error: error2 } = await supabase.from("usage").insert({
            org_id: org!.id,
            usage: cost,
            num_user_queries: isPlayground ? 0 : numUserQueries,
          });
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
      { status: 500, headers },
    );
  }
}

export interface ToConfirm extends FunctionCall {
  actionId: number;
}

async function Angela( // Good ol' Angela
  controller: ReadableStreamDefaultController,
  reqData: AnswersType,
  actions: ActionPlusApiInfo[],
  org: OrgJoinIsPaidFinetunedModels,
  conversationId: number,
  previousMessages: GPTMessageInclSummary[],
  language: string | null,
  currentHost: string,
): Promise<{
  nonSystemMessages: GPTMessageInclSummary[];
  cost: number;
  numUserQueries: number;
}> {
  const encoder = new TextEncoder();
  const nonSystemMessages = [...previousMessages];

  function streamInfo(step: StreamingStepInput) {
    controller.enqueue(
      encoder.encode(
        "data: " +
          JSON.stringify({
            id: conversationId,
            ...step,
          }),
      ),
    );
  }

  const model = org.model;

  if (actions.length > 5)
    actions = await filterActions(
      actions,
      conversationId,
      nonSystemMessages[nonSystemMessages.length - 1].content,
      model,
    );

  let mostRecentParsedOutput = {
    reasoning: "",
    plan: "",
    tellUser: "",
    commands: [] as FunctionCall[],
    completed: false,
  };

  let numOpenAIRequests = 0;
  let totalCost = 0;
  let numUserQueries = 0;
  let awaitingConfirmation = false;

  // When this number is reached, we remove the oldest messages from the context window
  const maxConvLength = model === "gpt-4-0613" ? 20 : 14;

  if (redis) {
    // Store the system prompt, in case we get feedback on it
    const redisKey = conversationId.toString() + "-system-prompt";
    await redis.set(
      redisKey,
      getMessages([], actions, reqData.user_description, org, language)[0]
        .content,
    );
    await redis.expire(redisKey, 60 * 15);
  }

  try {
    while (!mostRecentParsedOutput.completed && !awaitingConfirmation) {
      let chatGptPrompt: ChatGPTMessage[] = getMessages(
        // To stop going over the context limit: only remember the last 'maxConvLength' messages
        nonSystemMessages
          .slice(Math.max(0, nonSystemMessages.length - maxConvLength))
          // Set summaries to 'content' - don't show AI un-summarized output
          .map(MessageInclSummaryToGPT),
        actions,
        reqData.user_description,
        org,
        language,
      );

      console.log("Main system prompt:\n", chatGptPrompt[0].content);

      // Replace messages with `CleanedMessages` which has long IDs replaced with a placeholder.
      // idStore is a map from the cleaned to the original IDs
      const { cleanedMessages, valueVariableMap } =
        sanitizeMessages(chatGptPrompt);
      chatGptPrompt = cleanedMessages;

      // If over context limit, remove oldest function calls
      chatGptPrompt = removeOldestFunctionCalls(
        [...chatGptPrompt],
        model === "gpt-4-0613" ? "4" : "3",
      );

      // If still over the context limit tell the user to remove actions
      const tokenCount = getTokenCount(chatGptPrompt);
      // TODO - add limits for more models
      const maxTokens = model.includes("gpt-3.5") ? 4096 : 8192;

      if (tokenCount >= maxTokens - MAX_TOKENS_OUT) {
        console.error(
          `Cannot call LLM API for conversation with id: ${conversationId}. Context limit reached`,
        );
        streamInfo({
          role: "error",
          content:
            "Your organization has too many actions enabled to complete this request. Disable some actions or contact your IT team.",
        });
        return { nonSystemMessages, cost: totalCost, numUserQueries };
      }

      const promptInputCost = openAiCost(chatGptPrompt, "in", model);
      console.log("GPT input cost:", promptInputCost);
      totalCost += promptInputCost;

      const res = await exponentialRetryWrapper(
        streamLLMResponse,
        [chatGptPrompt, completionOptions, model],
        3,
      );
      if (res === null || "message" in res) {
        console.error(
          `OpenAI API call failed for conversation with id: ${conversationId}. The error was: ${res?.message}`,
        );
        streamInfo({
          role: "error",
          content: "Call to Language Model API failed",
        });
        return { nonSystemMessages, cost: totalCost, numUserQueries };
      }

      // Stream response from OpenAI
      let rawOutput = await streamResponseToUser(res, streamInfo);

      const newMessage = {
        role: "assistant",
        content: rawOutput,
      } as ChatGPTMessage;

      const outCost = openAiCost([newMessage], "out", model);
      totalCost += outCost;

      mostRecentParsedOutput = parseOutput(rawOutput);

      // We only count a query against a user's quota if the AI selects an action to take.
      // We don't count it if the AI is just asking for more information, or if the user says 'hi' etc.
      if (
        mostRecentParsedOutput.commands &&
        mostRecentParsedOutput.commands.length > 0
      )
        numUserQueries += 1;

      // Add assistant message to nonSystemMessages
      nonSystemMessages.push(newMessage);

      const toUserCorrect: string[] = [];
      // Call endpoints here
      const commandMapOutput = (
        await Promise.all(
          mostRecentParsedOutput.commands.map(async (command) => {
            console.log("Processing command: ", command);
            const chosenAction = actions.find((a) => a.name === command.name);
            if (!chosenAction) {
              throw new Error(`Action ${command.name} not found!`);
            }

            // Re-add long IDs before making calls to the API
            const repopulatedArgs = repopulateVariables(
              command.args,
              valueVariableMap,
            );
            command.args = repopulatedArgs as FunctionCall["args"];

            const { corrections } = await getMissingArgCorrections(
              chosenAction,
              command,
              chatGptPrompt.concat(newMessage), // This may contain useful information for the correction
              getSecondaryModel(model),
            );

            let needsUserCorrection = false;

            if (Object.keys(corrections).length > 0) {
              for (const [param, response] of Object.entries(corrections)) {
                if (
                  !response
                    .toLowerCase()
                    .replace(/[^A-Z]+/gi, "")
                    .includes("askuser")
                ) {
                  command.args[param] = response;
                } else {
                  console.info("Needs user correction: ", param);
                  needsUserCorrection = true;
                  toUserCorrect.push(param);
                }
              }
            }

            if (needsUserCorrection) {
              // We check for nulls later in the .map() output to see if we need to ask
              // the user for more information
              return null;
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
                chosenAction.request_method!.toLowerCase(),
              )
            ) {
              const { url, requestOptions } =
                constructHttpRequest(actionToHttpRequest);
              let out;
              try {
                out = await makeHttpRequest(url, requestOptions, currentHost);
                out = processAPIoutput(out, chosenAction);
              } catch (e) {
                console.error(e);
                // @ts-ignore
                out = `Failed to call ${url}\n\n${e.toString()}`;
              }
              const outMessage: GPTMessageInclSummary = {
                role: "function",
                name: command.name,
                content: typeof out === "string" ? out : JSON.stringify(out),
              };

              // If >500 tokens, summarise the message
              if (
                typeof out === "string" &&
                getTokenCount([outMessage]) > 500
              ) {
                outMessage.summary = await summarizeText(out, org);
              }
              streamInfo(outMessage);
              nonSystemMessages.push(outMessage);
            } else {
              // This adds to the toConfirm array
              return {
                actionId: chosenAction.id,
                args: command.args,
                name: command.name,
              };
            }
          }),
        )
      ).filter((x) => x !== undefined);

      // Below checks for if there are any 'needs correction' messages
      if (commandMapOutput.some((output) => output === null)) {
        const correctionMessage = {
          role: "assistant",
          content:
            "<<[NEW-MESSAGE]>>" +
            "Tell user:\n" +
            "I'm sorry but I need more information before I can do that, please can you provide: " +
            toUserCorrect.join("\n"),
        } as ChatGPTMessage;

        nonSystemMessages.push(correctionMessage);
        streamInfo(correctionMessage);
        return { nonSystemMessages, cost: totalCost, numUserQueries };
      }

      // This is for typing purposes
      const toConfirm: ToConfirm[] = commandMapOutput.filter(
        (x): x is ToConfirm => x !== null,
      );
      awaitingConfirmation = toConfirm.length > 0;
      if (awaitingConfirmation) {
        streamInfo({
          role: "confirmation",
          content: JSON.stringify(toConfirm),
        });
        if (redis)
          await storeActionsAwaitingConfirmation(toConfirm, conversationId);
      }

      if (mostRecentParsedOutput.completed) {
        return { nonSystemMessages, cost: totalCost, numUserQueries };
      }

      numOpenAIRequests++;
      if (numOpenAIRequests >= 6) {
        console.error(
          `OpenAI API call limit reached for conversation with id: ${conversationId}`,
        );
        streamInfo({
          role: "error",
          content: "OpenAI API call limit reached",
        });
        return { nonSystemMessages, cost: totalCost, numUserQueries };
      }
    }
  } catch (e) {
    console.error(e?.toString() ?? "Internal server error");
    streamInfo({
      role: "error",
      content: e?.toString() ?? "Internal server error",
    });
    return { nonSystemMessages, cost: totalCost, numUserQueries };
  }
  return { nonSystemMessages, cost: totalCost, numUserQueries };
}
async function storeActionsAwaitingConfirmation(
  toConfirm: ToConfirm[],
  conversationId: number,
) {
  const redisKey = conversationId.toString() + "-toConfirm";
  if (toConfirm.length > 0 && redis) {
    if ((await redis.get(redisKey)) !== null)
      throw new Error(
        `Conversation ID "${conversationId}" already exists in redis, something has gone wrong`,
      );
    console.log("Setting redis key: ", redisKey);

    await redis.json.set(redisKey, "$", { toConfirm });
    // 10 minutes seems like a reasonable time if the user gets distracted etc
    await redis.expire(redisKey, 60 * 10);
  }
}

async function streamResponseToUser(
  res: ReadableStream<any>,
  streamInfo: (step: StreamingStepInput) => void,
) {
  const decoder = new TextDecoder();
  const reader = res.getReader();
  let rawOutput = "";
  let done = false;
  let incompleteChunk = "";
  let first = true;
  // https://web.dev/streams/#asynchronous-iteration
  while (!done) {
    const { value, done: doneReading } = await reader.read();

    done = doneReading;
    if (done) break;

    const contentItems = parseGPTStreamedData(
      incompleteChunk + decoder.decode(value),
    );

    incompleteChunk = contentItems.incompleteChunk
      ? contentItems.incompleteChunk
      : "";

    for (let content of contentItems.completeChunks) {
      // Sometimes starts with a newline
      if (first) {
        content = content.trimStart();
        first = false;
      }
      rawOutput += content;

      streamInfo({ role: "assistant", content });
    }

    if (contentItems.done) {
      done = true;
      break;
    }
  }
  return rawOutput;
}
