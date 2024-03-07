import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../../lib/database.types";
import { z } from "zod";
import { generateApiKey } from "../../lib/apiKey";
import { v4 as uuidv4 } from "uuid";
import { isValidBody } from "../../lib/edge-runtime/utils";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { createMiddlewareSupabaseClient } from "@supabase/auth-helpers-nextjs";

if (process.env.SERVICE_LEVEL_KEY_SUPABASE === undefined) {
  throw new Error("SERVICE_LEVEL_KEY_SUPABASE is not defined!");
}

if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === undefined) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined!");
}

const supabase = createClient<Database>(
  process.env.API_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SERVICE_LEVEL_KEY_SUPABASE ?? "",
);

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

let redis: Redis | null = null,
  ratelimit: Ratelimit | null = null;
if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  redis = Redis.fromEnv();

  // Free tier rate limit is 1 request per 30s
  ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(1, "30 s"),
  });
}

const headers = {
  "Content-Type": "application/json",
};

export default async function handler(req: NextRequest) {
  console.log("Create org called");
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Only POST requests allowed",
      }),
      {
        headers,
        status: 400,
      },
    );
  }
  const cookie = req.headers.get("cookie");
  if (!cookie) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers,
    });
  }
  const res = NextResponse.next();
  const authSupa = createMiddlewareSupabaseClient({ req, res });
  const {
    data: { session },
  } = await authSupa.auth.getSession();
  console.log("Session", session);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers,
    });
  }
  if (ratelimit) {
    // If over limit, success is false
    const { success } = await ratelimit.limit(session.user.id);
    if (!success) {
      return new Response(
        JSON.stringify({ error: "Rate limit hit (1 request/30s)" }),
        {
          status: 429,
          headers,
        },
      );
    }
  }
  const api_key = generateApiKey();
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name: "",
      api_key,
      description: "",
      join_link_id: uuidv4(),
      model: process.env.NEXT_PUBLIC_FINETUNED_GPT_DEFAULT ?? "gpt-4-0613",
    })
    .select();
  if (error) throw new Error(error.message);
  if (data === null) {
    throw new Error("No data returned from organizations insert");
  }
  const profileResp = await supabase
    .from("profiles")
    .update({ org_id: data[0].id })
    .eq("id", session.user.id)
    .select();
  if (profileResp.error) throw profileResp.error;
  if (profileResp.data === null)
    throw new Error("No data returned from profiles update");

  const isPaidResp = await supabase
    .from("is_paid")
    .insert({ org_id: data[0].id })
    .eq("id", session.user.id);
  if (isPaidResp.error) throw isPaidResp.error;

  return new Response(JSON.stringify({ success: true, data: data[0] }), {
    status: 200,
    headers,
  });
}
