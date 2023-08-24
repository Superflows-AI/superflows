import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { z } from "zod";
import { Database } from "../../../lib/database.types";
import { OrgJoinIsPaid } from "../../../lib/types";

import { Redis } from "@upstash/redis";
import { isValidBody } from "../../../lib/edge-runtime/utils";

let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  redis = Redis.fromEnv();

export const config = {
  runtime: "edge",
  // Edge gets upset with our use of recharts in chat-ui-react.
  // TODO: Make it possible to import chat-ui-react without recharts
  unstable_allowDynamic: ["**/node_modules/@superflows/chat-ui-react/**"],
};

const FeedbackZod = z.object({
  conversation_id: z.number(),
  feedback_positive: z.boolean(),
  conversation_length_at_feedback: z.number(),
  negative_feedback_text: z.nullable(z.string()),
});

type FeedbackType = z.infer<typeof FeedbackZod>;

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined!");
}
if (!process.env.SERVICE_LEVEL_KEY_SUPABASE) {
  throw new Error("SERVICE_LEVEL_KEY_SUPABASE is not defined!");
}

// Bring me my Bow of burning gold:
const supabase = createClient<Database>(
  // Bring me my arrows of desire:
  process.env.API_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  // Bring me my Spear: O clouds unfold!
  process.env.SERVICE_LEVEL_KEY_SUPABASE,
  // Bring me my Chariot of fire!
);

const headers = { "Content-Type": "application/json" };

export default async function handler(req: NextRequest) {
  try {
    console.log("/api/v1/feedback called!");
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

    // Validate that the request body is of the correct format
    const requestData = await req.json();
    if (!isValidBody<FeedbackType>(requestData, FeedbackZod)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers,
      });
    }

    if (requestData.conversation_id === null) {
      return new Response(
        JSON.stringify({
          message: "conversation_id null. Nothing to save feedback on",
        }),
        {
          status: 200,
          headers,
        },
      );
    }

    console.log(
      `Got call to feedback with valid request body for conversation ID: ${requestData.conversation_id}`,
    );

    let systemPrompt: string | null = null;
    if (redis) {
      const redisKey =
        requestData.conversation_id.toString() + "-system-prompt";
      systemPrompt = await redis.getdel(redisKey);
    }

    const { error: updateError } = await supabase.from("feedback").insert({
      conversation_id: requestData.conversation_id,
      feedback_positive: requestData.feedback_positive,
      conversation_length_at_feedback:
        requestData.conversation_length_at_feedback,
      negative_feedback_text: requestData.negative_feedback_text,
      system_prompt: systemPrompt,
    });

    if (updateError) throw new Error(updateError.message);

    if (
      process.env.CONTEXT_API_KEY &&
      process.env.USE_CONTEXT_ON &&
      org!.id === Number(process.env.USE_CONTEXT_ON)
    ) {
      // Note: this doesn't include the system messages
      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", requestData.conversation_id)
        .order("conversation_index", { ascending: true });
      if (error) throw new Error(error.message);

      await fetch("https://api.context.ai/api/v1/log/conversation/upsert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CONTEXT_API_KEY}`,
        },
        body: JSON.stringify({
          conversation: {
            messages: messages
              .map((m, idx) => {
                if (requestData.conversation_length_at_feedback === idx + 1) {
                  return {
                    role: m.role,
                    message: m.content,
                    rating: requestData.feedback_positive ? 1 : -1,
                  };
                }
                return {
                  role: m.role,
                  message: m.content,
                };
              })
              // Context don't support function messages yet(!)
              .filter((m) => m.role !== "function"),
          },
        }),
      });
    }

    return new Response(
      JSON.stringify({ message: "Feedback updated successfully" }),
      {
        status: 200,
        headers,
      },
    );
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
