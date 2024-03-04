import { createMiddlewareSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import { USAGE_LIMIT } from "../../../lib/consts";
import { Database } from "../../../lib/database.types";
import { Angela, Dottie } from "../../../lib/edge-runtime/ai";
import { Bertie } from "../../../lib/v2/edge-runtime/ai";
import {
  ApiResponseCutText,
  DBChatMessageToGPT,
  getFreeTierUsage,
  getHost,
  isValidBody,
} from "../../../lib/edge-runtime/utils";
import { getLanguage } from "../../../lib/language";
import {
  AnswersType,
  AnswersZod,
  ChatGPTMessage,
  GPTMessageInclSummary,
} from "../../../lib/models";
import {
  ActionTagJoinApiAndHeaders,
  HeaderRow,
  OrgJoinIsPaidFinetunedModels,
} from "../../../lib/types";

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
const supabase = createClient<Database>(
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
      // if (redis) {
      //   const redisStored = await redis.get(`org-${orgApiKey}`);
      //   if (redisStored) {
      //     org = redisStored as OrgJoinIsPaidFinetunedModels;
      //   }
      // }
      // if (!org) {
      const authRes = await supabase
        .from("organizations")
        .select(
          "id,name,api_key,description,model,sanitize_urls_first,language,chat_to_docs_enabled,chatbot_instructions,bertie_enabled, is_paid(is_premium), finetuned_models(openai_name)",
        )
        .eq("api_key", orgApiKey);
      if (authRes.error) throw new Error(authRes.error.message);
      // Set org in Redis for 30 minutes
      // redis?.setex(
      //   `org-${orgApiKey}`,
      //   60 * 30,
      //   JSON.stringify(authRes.data?.[0]),
      // );
      org = authRes.data?.[0] ?? null;
      // }
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
      if (redis) {
        const redisStored = await redis.get(
          `chat_messages_${org.id}_${requestData.conversation_id}`,
        );
        if (redisStored) {
          ({ previousMessages, language } = redisStored as {
            previousMessages: GPTMessageInclSummary[];
            language: string;
          });
        }
      }
      if (!previousMessages) {
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
      }
    } else {
      // TODO: Move to the end
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
    if (org.language !== "Detect Language") {
      language = org.language;
    } else if (!language && process.env.NEXT_PUBLIC_DETECT_LANGUAGE_KEY) {
      language = await getLanguage(requestData.user_input);
    }

    if (requestData.user_input) {
      const newUserMessage: ChatGPTMessage = {
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
    // if (redis) {
    //   const redisStored = await redis.get(`action_tags_${org.id}`);
    //   if (redisStored) {
    //     actionsWithTags = redisStored as ActionTagJoinApiAndHeaders[];
    //   }
    // }
    // if (!actionsWithTags) {
    const actionTagResp = await supabase
      .from("action_tags")
      .select("*,actions!inner(*),apis(*, fixed_headers(*))")
      .eq("org_id", org.id)
      .eq("actions.active", true);
    if (actionTagResp.error) throw new Error(actionTagResp.error.message);
    actionsWithTags = actionTagResp.data;
    // Set action tags in Redis for 30 minutes
    //   redis?.setex(
    //     `action_tags_${org.id}`,
    //     60 * 30,
    //     JSON.stringify(actionsWithTags),
    //   );
    // }

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
        { status: 404, headers },
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
        // Ask Angela or Dottie for the answer
        const aiToUse = org!.bertie_enabled ? Bertie : Angela;
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
              previousMessages,
              language,
            )
          : await aiToUse(
              controller,
              requestData,
              activeActions,
              org!,
              conversationId,
              previousMessages,
              language,
              currentHost,
            );
        await supabase.from("chat_messages").insert(
          allMessages.slice(previousMessages.length).map((m, idx) => {
            if (m.role === "function" && m.content.length > 10000) {
              m.content = ApiResponseCutText;
            }
            return {
              ...m,
              org_id: org!.id,
              conversation_id: conversationId,
              conversation_index: previousMessages.length + idx,
              language,
            };
          }),
        );
        // Set previous messages in Redis for 30 minutes
        redis?.setex(
          `chat_messages_${org!.id}_${conversationId}`,
          60 * 30,
          JSON.stringify({
            previousMessages: allMessages.map((m) => {
              if (m.role === "function" && m.content.length > 10000) {
                m.content = ApiResponseCutText;
              }
              return m;
            }),
            language,
          }),
        );

        if (
          process.env.CONTEXT_API_KEY &&
          process.env.USE_CONTEXT_ON &&
          org!.id === Number(process.env.USE_CONTEXT_ON)
        ) {
          await fetch("https://api.context.ai/api/v1/log/conversation/upsert", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.CONTEXT_API_KEY}`,
            },
            body: JSON.stringify({
              conversation: {
                messages: allMessages
                  .map((m, idx) => {
                    return {
                      role: m.role,
                      message: m.content,
                    };
                  })
                  // Function messages aren't supported by Context yet
                  .filter((m) => m.role !== "function"),
              },
            }),
          });
        }

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
