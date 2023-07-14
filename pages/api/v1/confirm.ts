import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { z } from "zod";
import { OrgJoinIsPaid } from "../../../lib/types";
import { isValidBody } from "../../../lib/utils";
import {
  httpRequestFromAction,
  processAPIoutput,
} from "../../../lib/edge-runtime/requests";

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

type ConfirmType = z.infer<typeof ConfirmZod>;

// TODO: is this the best thing for open source? Would require users to have a redis account
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

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
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SERVICE_LEVEL_KEY_SUPABASE ?? ""
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

    // Validate that the request body is of the correct format
    const requestData = await req.json();
    console.log("Request data:", requestData);
    if (!isValidBody<ConfirmType>(requestData, ConfirmZod)) {
      return new Response(JSON.stringify({ message: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (requestData.button_clicked === "no") {
      await redis.json.del(requestData.conversation_id.toString());
      return new Response("Rejected actions removed from cache", {
        status: 204,
        headers: { "Content-Type": "application/json" },
      });
    }

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

    const outs: { name: string; result: object }[] = [];
    for (const storedParam of storedParams) {
      const { data: action, error } = await supabase
        .from("actions")
        .select("*")
        .eq("id", storedParam.actionId)
        .single();
      if (error) throw new Error(error.message);
      let out = await httpRequestFromAction({
        action,
        parameters: storedParam.parameters as Record<string, unknown>,
        organization: org,
        userApiKey: requestData.user_api_key,
      });
      outs.push({ name: action.name, result: processAPIoutput(out, action) });
    }

    return new Response(JSON.stringify({ outs }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
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
