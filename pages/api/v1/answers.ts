import { createClient } from "@supabase/supabase-js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { USAGE_LIMIT } from "../../../lib/consts";
import { Database } from "../../../lib/database.types";
import { Angela, Dottie } from "../../../lib/edge-runtime/ai";
import { Bertie } from "../../../lib/v2/edge-runtime/ai";
import {
  ApiResponseCutText,
  DBChatMessageToGPT,
  getFreeTierUsage,
  getHost,
  getSessionFromCookie,
  isValidBody,
} from "../../../lib/edge-runtime/utils";
import { getLanguage } from "../../../lib/language";
import {
  AnswersType,
  AnswersZod,
  GPTMessageInclSummary,
} from "../../../lib/models";
import {
  ActionTagJoinApiAndHeaders,
  HeaderRow,
  OrgJoinIsPaidFinetunedModels,
} from "../../../lib/types";
import { matchQuestionToAnswer } from "../../../lib/v3/edge-runtime/matching";

export const config = {
  runtime: "edge",
  // Edge gets upset with our use of recharts in chat-ui-react.
  regions: ["iad1", "cle1"],
  // TODO: Make it possible to import chat-ui-react without recharts
  unstable_allowDynamic: [
    "**/node_modules/@superflows/chat-ui-react/**",
    "**/node_modules/lodash/**",
  ],
};

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined!");
}
if (!process.env.SERVICE_LEVEL_KEY_SUPABASE) {
  throw new Error("SERVICE_LEVEL_KEY_SUPABASE is not defined!");
}
if (!process.env.NEXT_PUBLIC_DETECT_LANGUAGE_KEY) {
  console.warn(
    `Warning: NEXT_PUBLIC_DETECT_LANGUAGE_KEY environment variable is not defined!

Set up an account on https://detectlanguage.com/ and add the api key as NEXT_PUBLIC_DETECT_LANGUAGE_KEY to ensure Superflows replies in the same language the user writes in.`,
  );
}

let redis: Redis | null = null,
  ratelimitFree: Ratelimit | null = null,
  ratelimitProduction: Ratelimit | null = null;
if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  redis = Redis.fromEnv();

  // Free tier rate limit is 3 requests per 10 seconds
  ratelimitFree = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(3, "10 s"),
  });
  // TODO: Raise this limit when necessary
  // Production tier rate limit is 30 requests per 10 seconds
  ratelimitProduction = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(30, "10 s"),
  });
}

// Bring me my Bow of burning gold:
const serviceLevelSupabase = createClient<Database>(
  // Bring me my arrows of desire:
  process.env.API_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  // Bring me my Spear: O clouds unfold!
  process.env.SERVICE_LEVEL_KEY_SUPABASE,
  // Bring me my Chariot of fire!
  {
    auth: {
      persistSession: false,
    },
  },
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

    // Check that the user hasn't surpassed the production rate limit (protects DB query below)
    if (ratelimitProduction) {
      // If over limit, success is false
      const { success } = await ratelimitProduction.limit(orgApiKey);
      if (!success) {
        return new Response(
          JSON.stringify({ error: "Rate limit hit (30 requests/10s)" }),
          {
            status: 429,
            headers,
          },
        );
      }
    }

    let org: OrgJoinIsPaidFinetunedModels | null = null;
    if (orgApiKey) {
      const authRes = await serviceLevelSupabase
        .from("organizations")
        .select(
          "id,name,api_key,description,model,sanitize_urls_first,language,chat_to_docs_enabled,chatbot_instructions,bertie_enabled,fun_loading_messages,bertie_disable_direct,enable_data_analysis,yond_cassius,fallback_to_bertie, is_paid(is_premium), finetuned_models(openai_name)",
        )
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

    // If free tier user, check that the user hasn't surpassed the free tier rate limit
    if (ratelimitFree && !org.is_paid[0].is_premium) {
      // If over limit, success is false
      const { success } = await ratelimitFree.limit(orgApiKey);
      if (!success) {
        return new Response(
          JSON.stringify({
            error:
              "Rate limit hit (3 requests/10s) - upgrade to a paid tier to use a higher rate limit",
          }),
          {
            status: 429,
            headers,
          },
        );
      }
    }

    // Check the cookie to see if the user is logged in via supabase (in playground) or not
    // This determines whether to increment usage or not
    let supabase = serviceLevelSupabase;
    let { session, supabase: sessionSupa } = await getSessionFromCookie(req);
    const is_playground = !!(session && session.user);
    if (sessionSupa) supabase = sessionSupa;

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

    const convMutexKey = `conversation_mutex-${requestData.conversation_id}`;
    if (requestData.conversation_id && redis) {
      const convIdInUse = await redis.get(convMutexKey);
      console.log(`Conversation mutex ${convIdInUse} for key ${convMutexKey}`);
      if (convIdInUse) {
        console.log("Conversation ID in use");
        return new Response(
          JSON.stringify({
            error:
              "A response for this conversation is already being generated - clear chat in this window and try again",
          }),
          { status: 500, headers },
        );
      } else {
        console.log("Setting conversation mutex key");
        void redis.setex(convMutexKey, 20, true);
      }
    }

    console.log(
      `Answers endpoint called with valid request body for conversation id: ${requestData.conversation_id}`,
    );

    // TODO: Add non-streaming API support (although the UX is 10x worse)
    if (requestData.stream === false) {
      return new Response(
        JSON.stringify({
          error: `Currently only the streaming API (stream=true) has been implemented. See API spec here: https://docs.superflows.ai/docs/api-specification/answers`,
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
        .select("*, conversations(end_user_id)")
        .eq("conversation_id", requestData.conversation_id)
        .eq("org_id", org.id)
        .order("conversation_index", { ascending: true });

      if (convResp.error) throw new Error(convResp.error.message);

      // User id set in request, not matched by DB
      if (
        convResp.data.length > 0 &&
        requestData.user_id &&
        convResp.data[0].conversations!.end_user_id !== requestData.user_id
      ) {
        return new Response(
          JSON.stringify({
            error: `Conversation with ID=${requestData.conversation_id} does not belong to user with ID=${requestData.user_id}`,
          }),
          { status: 400, headers },
        );
      }
      const conversation = convResp.data.map(DBChatMessageToGPT);

      if (!conversation) {
        return new Response(
          JSON.stringify({
            error: `Conversation with ID=${requestData.conversation_id} not found`,
          }),
          { status: 400, headers },
        );
      } else if (
        // Check last 5 messages for infinite retry loops
        convResp.data
          .filter((m) => m.role === "user")
          .slice(-5)
          .reduce(
            (acc, m) =>
              acc +
              Number(m.role === "user" && m.content === requestData.user_input),
            0,
          ) >= 5
      ) {
        return new Response(
          JSON.stringify({
            error: `Retrying the same message 6 times is not allowed, to stop infinite retry loops. Please try a different message.`,
          }),
          { status: 400, headers },
        );
      }
      previousMessages = conversation;
      // If the language is set for any message in the conversation, use that
      language = convResp.data.find((m) => !!m.language)?.language ?? null;
    } else {
      console.log(`No conversation ID provided. Creating new conversation`);
      const convoInsertRes = await supabase
        .from("conversations")
        .insert({
          org_id: org.id,
          is_playground,
          profile_id: session?.user?.id ?? null,
          end_user_id: requestData.user_id ?? null,
        })
        .select()
        .single();
      if (convoInsertRes.error) {
        throw new Error(convoInsertRes.error.message);
      }
      conversationId = convoInsertRes.data.id;
    }
    // If the language is not set, try to detect it using detectlanguage.com
    if (org.language !== "Detect Language") {
      language = org.language;
    } else if (!language && process.env.NEXT_PUBLIC_DETECT_LANGUAGE_KEY) {
      language = await getLanguage(requestData.user_input);
    }

    if (requestData.user_input) {
      const newUserMessage: { role: "user"; content: string } = {
        role: "user",
        content: requestData.user_input,
      };
      previousMessages.push(newUserMessage as GPTMessageInclSummary);
      console.log(
        "Number of previous messages in conversation: " +
          previousMessages.length,
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
    }

    // Get the active actions from the DB which we can choose between
    // Below gets the action tags and actions that are active
    let actionsWithTags: ActionTagJoinApiAndHeaders[] | null = null;
    const actionTagResp = await supabase
      .from("action_tags")
      .select("*,actions!inner(*),apis(*, fixed_headers(*))")
      .eq("org_id", org.id)
      .eq("actions.active", true);
    if (actionTagResp.error) throw new Error(actionTagResp.error.message);
    actionsWithTags = actionTagResp.data;

    const currentHost = getHost(req);

    // If api_params are set, override the api_host and headers for each action
    if (requestData.api_params) {
      // Only throw an error if in debug mode
      if (requestData.debug) {
        // Check api_params names match apis in apis table
        const unmatchedApiParamNames = requestData.api_params
          .map((api_param) => {
            const matchedApi = actionsWithTags!.find(
              (a) => a.apis?.name === api_param.name,
            );
            return matchedApi ? null : api_param.name;
          })
          .filter(Boolean);
        if (unmatchedApiParamNames.length > 0) {
          return new Response(
            JSON.stringify({
              error: `The following \`api_params\` names were not found: ${unmatchedApiParamNames.join(
                ", ",
              )}.\n\nMake sure the \`name\` parameter matches an API in the dashboard: ${currentHost}/actions`,
            }),
            { status: 400, headers },
          );
        }
      }

      // Override values in apis if api_params are set in request body
      actionsWithTags.forEach((tag) => {
        const apiParams = requestData.api_params?.find(
          (p) => p.name === tag.apis?.name,
        );
        if (apiParams) {
          tag.apis!.api_host = apiParams.hostname || tag.apis!.api_host;
          if (apiParams.headers) {
            // Concat api_params headers onto fixed_headers
            tag.apis!.fixed_headers = tag.apis!.fixed_headers.concat(
              Object.entries(apiParams.headers).map(
                ([k, v]): HeaderRow => ({
                  name: k,
                  created_at: "",
                  value: v,
                  id: "",
                  api_id: tag.apis!.id,
                }),
              ),
            );
          }
        }
      });
    }

    const activeActions = actionsWithTags!
      .map((tag) => {
        const mockUrl = currentHost + "/api/mock";
        // Store the api_host with each action
        return tag.actions.map((a) => ({
          ...a,
          api: {
            ...tag.apis!,
            // Override api_host if mock_api_responses is set to true
            api_host: requestData.mock_api_responses
              ? mockUrl
              : tag.apis!.api_host,
          },
          headers: tag.apis?.fixed_headers ?? [],
        }));
      })
      .flat()
      .filter((action) => action.active);
    if (
      !activeActions ||
      (activeActions.length === 0 && !org.chat_to_docs_enabled)
    ) {
      return new Response(
        JSON.stringify({
          error:
            "You have no active actions set for your organization. Add them if you have access to the Superflows dashboard or reach out to your IT team.",
        }),
        { status: 400, headers },
      );
    }
    activeActions.forEach((action) => {
      // Check that every action has an api_host
      if (!action.api.api_host) {
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

    const readableStream = new ReadableStream({
      async start(controller) {
        // Ask Angela, Bertie or Dottie for the answer, or check Cassius' answers, who thinks too much
        const aiToUse = org!.yond_cassius
          ? matchQuestionToAnswer
          : org!.bertie_enabled
          ? Bertie
          : Angela;
        const startTime = Date.now();
        const {
          nonSystemMessages: allMessages,
          cost,
          numUserQueries,
        } = activeActions.length === 0 && org!.chat_to_docs_enabled
          ? await Dottie(
              controller,
              requestData,
              org!,
              conversationId,
              [...previousMessages],
              language,
            )
          : await aiToUse(
              controller,
              requestData,
              activeActions,
              org!,
              conversationId,
              [...previousMessages],
              language,
              currentHost,
            );
        console.log(`Total generation time: ${Date.now() - startTime}ms`);
        if (redis && requestData.conversation_id) await redis.del(convMutexKey);
        // If any of the last message's LLM-derived values are set, update it in the DB
        const userMessage = allMessages[previousMessages.length - 1];
        if (userMessage.role === "user") {
          const { error: updateChatMessageErr } = await supabase
            .from("chat_messages")
            .update({
              ...userMessage,
              // Set to user input if no previous messages
              chat_summary:
                previousMessages.length === 1
                  ? requestData.user_input
                  : userMessage.chat_summary,
            })
            .eq("conversation_id", conversationId)
            .eq("conversation_index", previousMessages.length - 1);
          if (updateChatMessageErr)
            throw new Error(updateChatMessageErr.message);
        }
        const { error: chatMessageInsertErr } = await supabase
          .from("chat_messages")
          .insert(
            // TODO: Tighten types
            // @ts-ignore
            allMessages.slice(previousMessages.length).map((m, idx) => {
              if (m.role === "function" && m.content.length > 10000) {
                m.content = ApiResponseCutText;
              }
              if ("urls" in m) delete m.urls;
              return {
                ...m,
                org_id: org!.id,
                conversation_id: conversationId,
                conversation_index: previousMessages.length + idx,
                language,
              };
            }),
          );
        if (chatMessageInsertErr) throw new Error(chatMessageInsertErr.message);

        const todaysDate = new Date().toISOString().split("T")[0];
        const { data, error } = await supabase
          .from("usage")
          .select("*")
          .eq("org_id", org!.id)
          .eq("date", todaysDate);
        if (error) throw new Error(error.message);
        if (data.length > 0) {
          const { error } = await serviceLevelSupabase
            .from("usage")
            .update({
              usage: cost + data[0].usage,
              num_user_queries: is_playground
                ? data[0].num_user_queries
                : data[0].num_user_queries + numUserQueries,
            })
            .eq("id", data[0].id);
          if (error) throw new Error(error.message);
        } else {
          const { error: error2 } = await serviceLevelSupabase
            .from("usage")
            .insert({
              org_id: org!.id,
              usage: cost,
              num_user_queries: is_playground ? 0 : numUserQueries,
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
