import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { z } from "zod";
import { Action, OrgJoinIsPaid } from "../../../lib/types";
import { isValidBody } from "../../../lib/utils";
import {
  httpRequestFromAction,
  processAPIoutput,
} from "../../../lib/edge-runtime/requests";
import { parseOutput } from "../../../lib/parsers/parsers";
import { Database } from "../../../lib/database.types";
import { Ratelimit } from "@upstash/ratelimit";

export const config = {
  runtime: "edge",
};

const OptionalStringZod = z.optional(z.string());

const ConfirmZod = z.object({
  conversation_id: z.number(),
  user_api_key: OptionalStringZod,
  org_id: z.number(),
  button_clicked: z.enum(["yes", "no"]),
});

// Create a new ratelimiter, that allows 2 requests per 10 seconds
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  // TODO: When someone is in production, this should be raised
  limiter: Ratelimit.slidingWindow(2, "10 s"),
});

type ConfirmType = z.infer<typeof ConfirmZod>;

let redis: Redis | null = null;
// AHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH
if (
  !process.env.UPSTASH_REDIS_REST_URL ||
  !process.env.UPSTASH_REDIS_REST_TOKEN
) {
  console.log("Redis not found, falling back to supabase");
} else {
  redis = Redis.fromEnv();
}

const headers = { "Content-Type": "application/json" };

export default async function handler(req: NextRequest) {
  try {
    console.log("/api/v1/confirm called!");
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
        }
      );
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SERVICE_LEVEL_KEY_SUPABASE ?? ""
    );

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
    const { success } = await ratelimit.limit(token);
    if (!success) {
      return new Response(JSON.stringify({ error: "Rate limit hit" }), {
        status: 429,
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
    if (!org || !org.api_host) {
      return new Response(
        JSON.stringify({
          error: !org
            ? "Authentication failed"
            : "No API host found - add an API host on the API settings page",
        }),
        {
          status: !org ? 401 : 400,
          headers,
        }
      );
    }

    // Validate that the request body is of the correct format
    const requestData = await req.json();
    console.log("Request data:", requestData);
    if (!isValidBody<ConfirmType>(requestData, ConfirmZod)) {
      return new Response(JSON.stringify({ message: "Invalid request body" }), {
        status: 400,
        headers,
      });
    }

    if (requestData.button_clicked === "no") {
      if (redis) await redis.json.del(requestData.conversation_id.toString());
      return new Response("Rejected actions removed from cache", {
        status: 204,
        headers,
      });
    }

    let toExecute: { action: Action; params: object }[];

    if (redis) {
      const redisData = await redis.json.get(
        requestData.conversation_id.toString()
      );
      await redis.json.del(requestData.conversation_id.toString());

      if (!redisData) {
        return new Response(
          JSON.stringify({
            message: `ConversationId ${requestData.conversation_id} not found in redis cache`,
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const storedParams = redisData.toConfirm as {
        actionId: number;
        parameters: object;
      }[];

      toExecute = await Promise.all(
        storedParams.map(async (param) => {
          const action = await supabase
            .from("actions")
            .select("*")
            .eq("org_id", requestData.org_id)
            .eq("id", param.actionId)
            .single()
            .then((res) => res.data!);
          return {
            action: action,
            params: param.parameters,
          };
        })
      );
    } else {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("org_id", requestData.org_id)
        .eq("conversation_id", requestData.conversation_id)
        .eq("role", "assistant")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw new Error(error.message);

      toExecute = await Promise.all(
        parseOutput(data[0].content).commands.map(async (command) => {
          const action = await supabase
            .from("actions")
            .select("*")
            .eq("org_id", requestData.org_id)
            .eq("name", command.name)
            .single()
            .then((res) => res.data!);
          return {
            action: action,
            params: command.args,
          };
        })
      );
    }

    const outs: { name: string; result: object }[] = [];
    for (const execute of toExecute) {
      let out = await httpRequestFromAction({
        action: execute.action,
        parameters: execute.params as Record<string, unknown>,
        organization: org,
        userApiKey: requestData.user_api_key,
      });
      outs.push({
        name: execute.action.name,
        result: processAPIoutput(out, execute.action),
      });
    }

    return new Response(JSON.stringify({ outs }), {
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
      }
    );
  }
}
