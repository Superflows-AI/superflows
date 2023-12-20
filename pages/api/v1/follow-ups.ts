import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { z } from "zod";
import { OrgJoinIsPaid } from "../../../lib/types";
import { Database } from "../../../lib/database.types";
import { Ratelimit } from "@upstash/ratelimit";
import {
  DBChatMessageToGPT,
  getFreeTierUsage,
  isValidBody,
} from "../../../lib/edge-runtime/utils";
import { USAGE_LIMIT } from "../../../lib/consts";
import { exponentialRetryWrapper } from "../../../lib/utils";
import { getFollowUpSuggestionPrompt } from "../../../lib/prompts/suggestFollowUps";
import { getLLMResponse, getSecondaryModel } from "../../../lib/queryLLM";
import { parseFollowUpSuggestions } from "../../../lib/parsers/parsers";
import { LlmResponseCache } from "../../../lib/edge-runtime/llmResponseCache";

export const config = {
  runtime: "edge",
  // Edge gets upset with our use of recharts in chat-ui-react.
  // TODO: Make it possible to import chat-ui-react without recharts
  unstable_allowDynamic: [
    "**/node_modules/@superflows/chat-ui-react/**",
    "**/node_modules/lodash/**",
  ],
};

const FollowUpZod = z.object({
  conversation_id: z.number(),
  user_description: z.optional(z.string()),
});

type FollowUpType = z.infer<typeof FollowUpZod>;

let redis: Redis | null = null,
  ratelimitFree: Ratelimit | null = null,
  ratelimitProduction: Ratelimit | null = null;
if (
  !process.env.UPSTASH_REDIS_REST_URL ||
  !process.env.UPSTASH_REDIS_REST_TOKEN
) {
  console.log("Redis not found, falling back to supabase");
} else {
  redis = Redis.fromEnv();
  // Free tier ratelimiter, that allows 3 requests per 10 seconds
  ratelimitFree = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "10 s"),
  });
  // TODO: Increase this as necessary
  // Production ratelimiter, that allows 30 requests per 10 seconds
  ratelimitProduction = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "10 s"),
  });
}

const supabase = createClient<Database>(
  process.env.API_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SERVICE_LEVEL_KEY_SUPABASE ?? "",
);

const headers = { "Content-Type": "application/json" };

export default async function handler(req: NextRequest) {
  try {
    console.log("/api/v1/follow-ups called!");
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
          headers,
        },
      );
    }

    // Authenticate that the user is allowed to use this API
    let token = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "")
      .replace("bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers,
      });
    }

    // Check that the user hasn't surpassed the rate limit
    if (ratelimitProduction) {
      const { success } = await ratelimitProduction.limit(token);
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
    if (!org) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers,
      });
    }

    // If free tier user, check that the user hasn't surpassed the free tier rate limit
    if (ratelimitFree && !org.is_paid[0].is_premium) {
      const { success } = await ratelimitFree.limit(token);
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
    if (!isValidBody<FollowUpType>(requestData, FollowUpZod)) {
      return new Response(JSON.stringify({ message: "Invalid request body" }), {
        status: 400,
        headers,
      });
    }

    const convResp = await supabase
      .from("chat_messages")
      .select()
      .eq("conversation_id", requestData.conversation_id)
      .eq("org_id", org.id)
      .order("conversation_index", { ascending: true });

    if (convResp.error) throw new Error(convResp.error.message);
    if (convResp.data.length === 0) {
      return new Response(
        JSON.stringify({
          error: `Conversation with ID=${requestData.conversation_id} not found`,
        }),
        { status: 404, headers },
      );
    }

    const conversation = convResp.data.map(DBChatMessageToGPT);

    const cache = new LlmResponseCache();
    await cache.initialize(convResp.data[0].content, org.id, supabase);
    let llmOut = await cache.checkFollowUpCache(org.id, conversation, supabase);

    if (!llmOut) {
      // If the language is set for any message in the conversation, use that
      const language =
        convResp.data.find((m) => !!m.language)?.language ?? null;

      const fullPrompt = getFollowUpSuggestionPrompt(
        requestData.user_description,
        org,
        language,
        conversation,
      );
      console.log("Follow up prompt: ", fullPrompt);

      llmOut = await exponentialRetryWrapper(
        getLLMResponse,
        [
          fullPrompt,
          { max_tokens: 100, temperature: 0.8, frequency_penalty: 0.5 },
          getSecondaryModel(org.model),
        ],
        3,
      );
    }
    await saveFollowUps(
      llmOut,
      org.id,
      requestData.conversation_id,
      convResp.data?.length - 1,
    );
    const suggestions = parseFollowUpSuggestions(llmOut);
    console.log("Suggestions: ", suggestions);

    return new Response(JSON.stringify({ suggestions }), {
      status: 200,
      headers,
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
        headers,
      },
    );
  }
}

async function saveFollowUps(
  llmOutput: string,
  orgId: number,
  conversationId: number,
  conversation_index: number,
): Promise<void> {
  const insertRes = await supabase.from("follow_ups").insert({
    follow_up_text: llmOutput,
    org_id: orgId,
    conversation_id: conversationId,
    conversation_index: conversation_index,
  });
  if (insertRes.error) {
    console.error(
      "Failed to insert follow ups to DB:",
      insertRes.error.message,
    );
  }
}
