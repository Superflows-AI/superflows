import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { z } from "zod";
import { Action, OrgJoinIsPaid } from "../../../lib/types";
import { isValidBody } from "../../../lib/utils";
import {
  constructHttpRequest,
  makeHttpRequest,
  processAPIoutput,
} from "../../../lib/edge-runtime/requests";
import { Database } from "../../../lib/database.types";
import { Ratelimit } from "@upstash/ratelimit";
import { ToConfirm } from "./answers";
import { ChatGPTMessage } from "../../../lib/models";
import { parseOutput } from "@superflows/chat-ui-react";

export const config = {
  runtime: "edge",
  // Edge gets upset with our use of recharts in chat-ui-react.
  // TODO: Make it possible to import chat-ui-react without recharts
  unstable_allowDynamic: ["**/node_modules/@superflows/chat-ui-react/**"],
};

const OptionalStringZod = z.optional(z.string());

const ConfirmZod = z.object({
  conversation_id: z.number(),
  user_api_key: OptionalStringZod,
  confirm: z.boolean(),
  mock_api_responses: z.optional(z.boolean()),
  test_mode: z.optional(z.boolean()),
});

type ConfirmType = z.infer<typeof ConfirmZod>;

let redis: Redis | null = null,
  ratelimit: Ratelimit | null = null;
if (
  !process.env.UPSTASH_REDIS_REST_URL ||
  !process.env.UPSTASH_REDIS_REST_TOKEN
) {
  console.log("Redis not found, falling back to supabase");
} else {
  redis = Redis.fromEnv();
  // Create a new ratelimiter, that allows 3 requests per 10 seconds
  ratelimit = new Ratelimit({
    redis,
    // TODO: When someone is in production, this should be raised
    limiter: Ratelimit.slidingWindow(3, "10 s"),
  });
}

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SERVICE_LEVEL_KEY_SUPABASE ?? ""
);

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
    if (ratelimit) {
      const { success } = await ratelimit.limit(token);
      if (!success) {
        return new Response(JSON.stringify({ error: "Rate limit hit" }), {
          status: 429,
          headers,
        });
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

    // Validate that the request body is of the correct format
    const requestData = await req.json();
    if (!isValidBody<ConfirmType>(requestData, ConfirmZod)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers,
      });
    }

    console.log(
      `Got call to confirm with valid request body for conversation ID: ${requestData.conversation_id}`
    );

    // Override api_host if mock_api_responses is set to true
    if (org && requestData.mock_api_responses) {
      const currentHost =
        req.headers.get("x-forwarded-proto") + "://" + req.headers.get("host");
      org.api_host = currentHost + "/api/mock";
      console.log(
        "Mocking API responses: overriding api_host to",
        org.api_host
      );
    }
    if (!org?.api_host) {
      return new Response(
        JSON.stringify({
          error: "No API host found - add an API host on the API settings page",
        }),
        { status: 400, headers }
      );
    }

    // Count previous messages in the conversation
    const countMessagesRes = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", requestData.conversation_id)
      .eq("org_id", org.id);
    if (countMessagesRes.error) throw new Error(countMessagesRes.error.message);
    const numPastMessages = countMessagesRes.count ?? 0;

    console.log(
      `Found ${numPastMessages} past messages: ${JSON.stringify(
        countMessagesRes
      )}`
    );

    if (!requestData.confirm) {
      // Cancel - user said this is incorrect!
      if (redis) await redis.json.del(requestData.conversation_id.toString());
      // Respond with a message from the assistant & add user cancel to GPT history
      const assistantMessage = {
        role: "assistant",
        content:
          "Tell user: I've cancelled this. What would you like me to do instead?",
      };

      const cancelRes = await supabase.from("chat_messages").insert([
        {
          role: "user",
          content: "Cancel actions",
          conversation_id: requestData.conversation_id,
          org_id: org.id,
          conversation_index: numPastMessages,
        },
        {
          ...assistantMessage,
          conversation_id: requestData.conversation_id,
          org_id: org.id,
          conversation_index: numPastMessages + 1,
        },
      ]);
      if (cancelRes.error) throw new Error(cancelRes.error.message);

      return new Response(
        JSON.stringify({
          outs: [assistantMessage],
        }),
        {
          status: 200,
          headers,
        }
      );
    }

    let toExecute: { action: Action; params: object }[] = [];

    if (redis) {
      const redisData = await redis.json.get(
        requestData.conversation_id.toString()
      );
      await redis.json.del(requestData.conversation_id.toString());

      if (redisData) {
        const storedParams = redisData.toConfirm as ToConfirm[];

        toExecute = await Promise.all(
          storedParams.map(async (param) => {
            const action = await supabase
              .from("actions")
              .select("*")
              .eq("org_id", org!.id)
              .eq("id", param.actionId)
              .single()
              .then((res) => res.data!);
            return {
              action: action,
              params: param.args,
            };
          })
        );
        console.log("Got toExecute from redis:", JSON.stringify(toExecute));
      }
    }
    // If there is no redis data, get the data from the database
    if (toExecute.length === 0) {
      console.log("No redit data. Getting toExecute from database");
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("org_id", org!.id)
        .eq("conversation_id", requestData.conversation_id)
        .eq("role", "assistant")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw new Error(error.message);
      console.log("Data from database:", JSON.stringify(data));
      toExecute = await Promise.all(
        parseOutput(data[0].content).commands.map(async (command) => {
          const action = await supabase
            .from("actions")
            .select("*")
            .eq("org_id", org!.id)
            .eq("name", command.name)
            .single()
            .then((res) => res.data!);
          return {
            action: action,
            params: command.args,
          };
        })
      );
      console.log("Got toExecute from database:", JSON.stringify(toExecute));
    }

    const outs: ChatGPTMessage[] = await Promise.all(
      toExecute.map(async (execute, idx) => {
        console.log("Executing action:", JSON.stringify(execute));
        const { url, requestOptions } = await constructHttpRequest({
          action: execute.action,
          parameters: execute.params as Record<string, unknown>,
          organization: org!,
          userApiKey: requestData.user_api_key,
        });
        let output = await makeHttpRequest(url, requestOptions);

        console.log("http request:", JSON.stringify(output));

        const out = {
          role: "function",
          name: execute.action.name,
          content: JSON.stringify(
            processAPIoutput(output, execute.action),
            null,
            2
          ),
        } as ChatGPTMessage;

        console.log("out:", JSON.stringify(out));

        // Add to DB to ensure state is consistent
        const funcRes = await supabase.from("chat_messages").insert({
          ...out,
          conversation_id: requestData.conversation_id,
          org_id: org!.id,
          conversation_index: numPastMessages + idx,
        });
        if (funcRes.error) throw new Error(funcRes.error.message);
        return out;
      })
    );

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
